import {storageKeys} from "../helpers/queries.ts";
import {loadConfig} from "../lib/config.ts";
import type {Page} from "@playwright/test";
import {expect, login, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";

readOnlyTest("About page renders app version and commit hash", {tag: "@ui"}, async ({page}) => {
  const cfg = await loadConfig();
  await openPage(page, "/help/about", cfg.ui.admin);

  await expect(page.getByText("about_page.app_version")).toBeVisible();
  await expect(page.getByText("about_page.commit_info")).toBeVisible();
  // Confirm the rendered version appears in the about-page body, not just the always-visible
  // navbar link (which would match `app_version{...}` on any page).
  await expect(page.locator("main").getByText(/app_version\{/)).toBeVisible();
});

readOnlyTest("system status endpoint reachable", async ({api}) => {
  const data = await api.getData<{version: string; currentDate: string; randomUuid: string}>("system/status");
  expect(data.version).toBeTruthy();
  expect(data.currentDate).toBeTruthy();
  expect(data.randomUuid).toMatch(/^[0-9a-f-]+$/);
});

readOnlyTest("help index renders default markdown page", {tag: "@ui"}, async ({page}) => {
  const cfg = await loadConfig();
  await openPage(page, "/help", cfg.ui.admin);
  // /help redirects to /help/index. The markdown renderer should produce a heading.
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

readOnlyTest("dictionary list endpoint returns fixed dictionaries", async ({api}) => {
  const dicts = await api.dictionaries();
  expect(dicts.meetingType!.other).toBeTruthy();
  expect(dicts.meetingStatus!.planned).toBeTruthy();
  expect(dicts.attendanceStatus!.ok).toBeTruthy();
});

readOnlyTest("translation list endpoint returns a valid locale pack", async ({api}) => {
  // "testing" isn't a real locale folder — the server falls back to the default. We just
  // confirm the endpoint returns a structured response with the locale marker.
  const res = await api.get("system/translation/testing/list");
  const body = (await res.json()) as Record<string, unknown>;
  expect(typeof body).toBe("object");
  expect(body).not.toBeNull();
  expect(typeof body[""]).toBe("string");
});

// In the testing language every help path shows one fixed document, so these stay in Polish, the
// only language of the help pages.
readOnlyTest(
  "help: a link of the index opens the topic; an unknown topic is not found",
  {tag: "@ui"},
  async ({page}) => {
    const cfg = await loadConfig();
    await login(page, cfg.ui.admin);
    await page.goto("/help");
    await expect(page).toHaveURL(/\/help\/index$/);
    const main = page.locator("main");
    await expect(main.getByRole("heading", {level: 1, name: "Strona główna pomocy"})).toBeVisible();

    await main.getByRole("link", {name: "Usuwanie klientów", exact: true}).click();
    await expect(page).toHaveURL(/\/help\/client-delete$/);
    await expect(main.getByRole("heading", {level: 1, name: "Usuwanie klientów"})).toBeVisible();
    await expect(main.getByRole("heading", {name: "Strona główna pomocy"})).toHaveCount(0);
    // The topic is the title of the browser tab too.
    await expect(page).toHaveTitle(/Usuwanie klientów/);

    await page.goto("/help/no-such-topic");
    await expect(main.getByRole("heading", {level: 1, name: "404 Nie znaleziono strony"})).toBeVisible();
    await expect(main).toContainText("no-such-topic");
  },
);

const NOT_FOUND_HEADING = "404 Nie znaleziono strony";

readOnlyTest(
  "help: every link of the index leads to a help page, with its images loaded",
  {tag: "@ui"},
  async ({page}) => {
    // A page load per topic.
    test.setTimeout(240_000);
    const cfg = await loadConfig();
    await login(page, cfg.ui.admin);
    await page.goto("/help/index");
    const main = page.locator("main");
    await expect(main.getByRole("heading", {level: 1})).toBeVisible();
    const paths = await main
      .locator("a[href]")
      .evaluateAll((links) => [
        ...new Set(
          (links as HTMLAnchorElement[])
            .filter(({origin, pathname}) => origin === location.origin && pathname.startsWith("/help/"))
            .map(({pathname}) => pathname),
        ),
      ]);
    // Opening the version log marks the news as read, so that page has a test of its own.
    const topics = paths.filter((path) => path !== "/help/changelog" && path !== "/help/index").sort();
    expect(topics.length).toBeGreaterThan(20);
    for (const path of topics) {
      await test.step(path, async () => {
        await page.goto(path);
        const heading = main.getByRole("heading", {level: 1}).first();
        await expect.soft(heading).toBeVisible();
        await expect.soft(heading).not.toHaveText(NOT_FOUND_HEADING);
        await expect
          .soft(async () => {
            const broken = await main
              .locator("img")
              .evaluateAll((images) =>
                (images as HTMLImageElement[])
                  .filter((img) => !img.complete || !img.naturalWidth)
                  .map((img) => img.src),
              );
            expect(broken).toEqual([]);
          })
          .toPass({timeout: 10_000});
      });
    }
  },
);

async function currentMinorVersion(api: MemoAPI) {
  const {version} = await api.getData<{version: string}>("system/status");
  return version.split(".").slice(0, 2).join(".");
}

/** A user of these tests' own: whether the news were read is kept in the storage of the user. */
const NEWS_READER = {name: "News Test Reader", email: "news-reader@test.pl", password: "NewsReaderPass1!"} as const;

/** The link in the menu to the news of the current version, shown until the user has read them. */
const newsLink = (page: Page) => page.locator('a[href^="/help/changelog#v"]');

/**
 * Creates the user, logs in and opens the help index, with the user's state of reading the news
 * stored. A user with nothing stored yet (a new one) is not shown the link in the first session —
 * the app stores the state in that session and shows the link from the next page load on.
 */
async function openHelpWithNewsStateStored(page: Page, globalAdminApi: MemoAPI) {
  await globalAdminApi.createUser({...NEWS_READER, hasEmailVerified: true, hasGlobalAdmin: true});
  await login(page, NEWS_READER);
  const readerApi = await globalAdminApi.loggedInAs(NEWS_READER);
  await page.goto("/help/index");
  await expect.poll(async () => (await storageKeys(readerApi)).join()).toMatch(/newspaper/);
  await page.reload();
}

// The news are marked as read in the storage of the user, on the server.
test(
  "help: the menu links to the news of the current version until the version log is opened",
  {tag: "@ui"},
  async ({page, api, globalAdminApi}) => {
    const version = await currentMinorVersion(api);
    await openHelpWithNewsStateStored(page, globalAdminApi);
    await expect(newsLink(page)).toHaveAttribute("href", `/help/changelog#v${version}`);

    await newsLink(page).click();
    await expect(page).toHaveURL(new RegExp(`/help/changelog#v${version.replace(".", "\\.")}$`));
    const main = page.locator("main");
    await expect(main.getByRole("heading", {level: 1, name: /^Co nowego w /})).toBeVisible();
    // The log is put together from a part per version; the link leads to the current one.
    await expect(main.locator(`[id="v${version}"]`)).toBeInViewport();
    expect(await main.locator('h2[id^="v"]').count()).toBeGreaterThan(5);
    await expect(main).not.toContainText("$include(");
    await expect(main).not.toContainText("$t(");

    await expect(newsLink(page)).toHaveCount(0);
    await page.goto("/help/index");
    await expect(main.getByRole("heading", {level: 1})).toBeVisible();
    await expect(newsLink(page)).toHaveCount(0);
  },
);

test(
  "help: the link to the news is dismissed with its close button, for good",
  {tag: "@ui"},
  async ({page, globalAdminApi}) => {
    await openHelpWithNewsStateStored(page, globalAdminApi);
    await expect(newsLink(page)).toBeVisible();
    await newsLink(page).locator("xpath=following-sibling::button").click();
    await expect(newsLink(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/help\/index$/);

    await page.reload();
    await expect(page.locator("main").getByRole("heading", {level: 1})).toBeVisible();
    await expect(newsLink(page)).toHaveCount(0);
  },
);

// In Polish, as the help is: in the testing language the modal would show the one fixed document.
readOnlyTest(
  "help: an info icon shows a help page in a modal, with a link to the full page",
  {tag: "@ui"},
  async ({page}) => {
    const cfg = await loadConfig();
    await login(page, cfg.ui.admin);
    await page.goto("/help/about");
    const openDocs = async () => {
      await page.locator("title=Opcje użytkownika").click();
      // The icon is a button inside the button that configures the OTP.
      await page.getByRole("button", {name: "Aktywuj OTP"}).getByRole("button").click();
    };
    await openDocs();
    // The modal is outside of the page's main area, which keeps its own heading.
    const modalHeading = page.getByRole("heading", {level: 1, name: "Uwierzytelnianie dwuskładnikowe", exact: true});
    await expect(modalHeading).toBeVisible();
    await expect(page.locator("main").getByRole("heading", {level: 1})).not.toHaveText(
      "Uwierzytelnianie dwuskładnikowe",
    );
    await expect(page).toHaveURL(/\/help\/about$/);
    await page.keyboard.press("Escape");
    await expect(modalHeading).toHaveCount(0);

    await openDocs();
    const fullPageLink = page.getByRole("link", {name: "Otwórz pełną stronę pomocy"});
    await expect(fullPageLink).toHaveAttribute("href", "/help/staff-2fa");
    await fullPageLink.click();
    await expect(page).toHaveURL(/\/help\/staff-2fa$/);
    await expect(
      page.locator("main").getByRole("heading", {level: 1, name: "Uwierzytelnianie dwuskładnikowe"}),
    ).toBeVisible();
  },
);

// The developers' help is in English, and is not replaced in the testing language either.
readOnlyTest("help: the developers' help shows its index and follows a link in it", {tag: "@ui"}, async ({page}) => {
  const cfg = await loadConfig();
  await login(page, cfg.ui.admin);
  await page.goto("/help/dev");
  await expect(page).toHaveURL(/\/help\/dev\/index$/);
  const main = page.locator("main");
  await expect(main.getByRole("heading", {level: 1, name: "Developers help"})).toBeVisible();
  await expect(page).toHaveTitle(/Developers help/);
  const logo = main.getByRole("img", {name: "Memo logo"});
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  await page.goto("/help/dev/developer-modes");
  await expect(main.getByRole("heading", {level: 1, name: "Developer modes"})).toBeVisible();
  await expect(main.getByRole("heading", {name: "Developers help"})).toHaveCount(0);
});
