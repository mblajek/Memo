import {test as base, expect, type APIRequestContext, type Page} from "@playwright/test";
import {MemoAPI, MemoAPIError, extendTestTimeout, loginThrottleWaitMs, withTimeBudget} from "./api.ts";
import {loadConfig, type Credentials} from "./config.ts";
import {getDB} from "./db.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {loadActiveLayer, markDirty, tablesChangedSinceActiveLayer} from "./layers.ts";
import {log} from "./log.ts";
import {registerSelectors} from "../helpers/selectors.ts";
import {sessions} from "./session_cache.ts";

// Each worker process imports this module before running any test in it; this top-level await
// makes sure custom selector engines are registered in the worker's process.
await registerSelectors();

export {expect};
export {MemoAPI, MemoAPIError};

/**
 * Does `submit`, which sends the login form, and resolves with the server's answer to it. If
 * Memo's `throttle:5,1,api_login` answers with 429, clears the throttle where that can be done,
 * otherwise waits for as long as the response says, and submits again, until the throttle clears
 * or `totalTimeoutMs` elapses — the default covers the 60s window of the throttle. The wait is
 * added to the test's timeout.
 *
 * The caller then asserts whatever outcome they expect. Throws if the throttle persists past the
 * total timeout.
 */
export async function submitLoginWithThrottleRetry(
  page: Page,
  submit: () => Promise<void>,
  {totalTimeoutMs = 90_000}: {totalTimeoutMs?: number} = {},
) {
  const start = Date.now();
  for (let attempt = 1; ; attempt++) {
    // The toast of a throttled attempt would otherwise still be there for the caller to see.
    const toastWaitStart = Date.now();
    await page
      .getByText("exception.unexpected")
      .waitFor({state: "hidden", timeout: 30_000})
      .catch(() => undefined);
    extendTestTimeout(Date.now() - toastWaitStart);
    const responsePromise = page.waitForResponse(
      (res) => res.request().method() === "POST" && new URL(res.url()).pathname.endsWith("/user/login"),
    );
    await submit();
    const response = await responsePromise;
    if (response.status() !== 429) {
      return response;
    }
    const waitMs = await loginThrottleWaitMs(response.headers(), attempt);
    const elapsed = Date.now() - start;
    if (elapsed + waitMs > totalTimeoutMs) {
      throw new Error(`Login form persistently throttled — gave up after ${attempt} attempt(s)`);
    }
    if (waitMs) {
      log.warn(`Login form throttled (attempt ${attempt}, ${Math.round(elapsed / 1000)}s in) — waiting ${waitMs}ms`);
    }
    extendTestTimeout(waitMs);
    await page.waitForTimeout(waitMs);
  }
}

/** Submits the visible login form (email + password fields) with Enter, past the throttle. */
export async function submitLoginFormWithThrottleRetry(page: Page, email: string, password: string): Promise<void> {
  await submitLoginWithThrottleRetry(page, async () => {
    await page.locator('input[name="email"]').fill(email);
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill(password);
    await passwordInput.press("Enter");
  });
}

export async function login(page: Page, creds: Credentials) {
  // Delegate to MemoAPI.spawn so cache validation (probe + re-login on stale) is shared. Then
  // copy the resulting cookies into the page's browser context.
  const api = await MemoAPI.spawn(creds);
  try {
    const cookies = (await sessions.get((await loadConfig()).ui.baseURL, creds.email)) ?? [];
    if (cookies.length) {
      await page.context().addCookies([...cookies]);
    }
  } finally {
    await api.dispose();
  }
}

/**
 * Opens the path in the testing language, logging in first if a user is given.
 */
export async function openPage(page: Page, path: string, creds?: Credentials) {
  if (creds) {
    await login(page, creds);
  }
  await page.goto(path);
  await disableTranslations(page);
}

/**
 * The tag of the tests that drive a page. A browser other than the main one runs only these: the
 * rest talk to the server alone, and would only be repeated.
 */
const UI_TAG = "@ui";

/** Whether the test takes a fixture that opens a browser. */
function drivesPage(testFunction: unknown) {
  // The fixtures of a test are the names in its first parameter; Playwright reads them the same way.
  const fixtures = /^(?:async\s*)?\(\s*\{([^}]*)\}/.exec(String(testFunction))?.[1] ?? "";
  return /\b(page|pageApi|context|browser)\b/.test(fixtures);
}

const RESTORE_STATE_TIMEOUT_MS = 5 * 60_000;

async function useMemoAPI(request: APIRequestContext, use: (api: MemoAPI) => Promise<void>) {
  const api = new MemoAPI(request, (await loadConfig()).ui.baseURL);
  try {
    await use(api);
  } finally {
    // Disposes the children spawned via `api.loggedInAs(...)`. The wrapped context is owned by
    // Playwright and not touched.
    await api.dispose();
  }
}

interface Fixtures {
  /**
   * Option fixture. Default `false` — the test is assumed to mutate the DB and the next test will
   * restore the layer snapshot. Set to `true` via `test.use({readOnly: true})` (per file/describe),
   * or use `readOnlyTest` instead of `test` for a single test. Failed tests are always treated as
   * mutating.
   */
  readonly readOnly: boolean;
  /**
   * Anonymous `MemoAPI` with a session of its own, and no browser. Call `api.loggedInAs(creds)`
   * to spawn a separate-session API logged in as a user — its lifetime is tied to this fixture
   * (auto-disposed at test end).
   */
  readonly api: MemoAPI;
  /**
   * `MemoAPI` in the session of `page`: its calls are made as the user logged in on the page, and
   * see what the page did to the session.
   */
  readonly pageApi: MemoAPI;
  /** A `MemoAPI` logged in as the global admin of the config, with a session of its own. */
  readonly globalAdminApi: MemoAPI;
  readonly _restoreState: void;
}

/**
 * Drop-in replacement for `@playwright/test`'s `test`. Adds an autouse fixture that, around every
 * test, restores the DB to the current layer's snapshot beforehand and marks it dirty unless the
 * test is read-only and passes; if the test fails, a fresh dump is taken and a reference to it
 * attached to the report for later inspection.
 * Also provides the `api` fixtures, with CSRF handling.
 */
export const test = base.extend<Fixtures>({
  readOnly: [false, {option: true}],
  api: async ({request}, use) => {
    await useMemoAPI(request, use);
  },
  pageApi: async ({page}, use) => {
    await useMemoAPI(page.request, use);
  },
  globalAdminApi: async ({api}, use) => {
    await use(await api.loggedInAs((await loadConfig()).ui.admin));
  },
  _restoreState: [
    async ({readOnly}, use, testInfo) => {
      if (drivesPage(testInfo.fn) !== testInfo.tags.includes(UI_TAG)) {
        throw new Error(
          drivesPage(testInfo.fn)
            ? `The test drives a page: declare it with \`{tag: "${UI_TAG}"}\`, for the other browsers to run it too.`
            : `The test is tagged ${UI_TAG}, but does not drive a page.`,
        );
      }
      await test.step(
        "Load active DB layer",
        async () => {
          await withTimeBudget(RESTORE_STATE_TIMEOUT_MS, loadActiveLayer);
        },
        {box: true},
      );
      // Before the test, not after: if the process dies mid-test, nothing after `use()` runs.
      if (!readOnly) {
        await markDirty();
      }
      const tag = readOnly ? " [read-only]" : "";
      await log.timed(`Test "${testInfo.title}"${tag}`, () => use());
      let changedByReadOnly: string[] = [];
      if (readOnly) {
        // The declaration is checked: a read-only test that writes would otherwise fail some other
        // test, the next one to count on the layer's state.
        try {
          changedByReadOnly = testInfo.status === "passed" ? await tablesChangedSinceActiveLayer() : [];
        } catch (e) {
          // Not known to be unchanged.
          await markDirty();
          throw e;
        }
        if (testInfo.status !== "passed" || changedByReadOnly.length) {
          await markDirty();
        }
      }
      if (testInfo.status !== testInfo.expectedStatus || changedByReadOnly.length) {
        try {
          const db = await getDB();
          const label = testInfo.titlePath.join(" : ");
          // The test's own output dir: unique per test and retry, and kept until the next run.
          const ref = await db.dumpForInspection(label, testInfo.outputPath("db-dump-on-failure.sql"));
          await testInfo.attach("db-dump-on-failure", {body: ref, contentType: "text/plain"});
        } catch (e) {
          await testInfo.attach("db-dump-on-failure-error", {body: String(e), contentType: "text/plain"});
        }
      }
      if (changedByReadOnly.length) {
        throw new Error(
          `The test is declared read-only, but it changed the DB (tables: ${changedByReadOnly.join(", ")}). ` +
            `Declare it with \`test\`, or make it leave the DB as it found it.`,
        );
      }
    },
    // Own budget for the restore and the failure dump, separate from the test's timeout.
    {auto: true, timeout: RESTORE_STATE_TIMEOUT_MS},
  ],
});

/**
 * Variant of `test` with `readOnly` defaulted to `true`. Use for tests that only read DB state, so
 * the framework doesn't restore the layer snapshot before the next test.
 */
export const readOnlyTest = test.extend({readOnly: true});
