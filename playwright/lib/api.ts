import {test as base, request as pwRequest, type APIRequestContext, type APIResponse} from "@playwright/test";
import {loadConfig, type Credentials} from "./config.ts";
import {clearAppCache} from "./docker_app.ts";
import {log} from "./log.ts";
import {sessions} from "./session_cache.ts";

/**
 * Returns how long to wait before trying again after a throttled (429) response with the given
 * headers: what the response asks for, with a second to spare; ten seconds if it does not say.
 */
function throttleWaitMs(headers: Readonly<Record<string, string>>) {
  const retryAfterSecs = Number(headers["retry-after"]);
  return Number.isFinite(retryAfterSecs) && retryAfterSecs > 0 ? (retryAfterSecs + 1) * 1000 : 10_000;
}

/**
 * Gets a throttled (429) login ready to be tried again, and returns how long to wait first. On
 * the first attempt against an app the tests run themselves the throttle is cleared, with no
 * wait; otherwise, or if that fails, the wait is the one the response asks for. The time taken
 * here is added to the timeout of the running test.
 */
export async function loginThrottleWaitMs(headers: Readonly<Record<string, string>>, attempt: number) {
  if (attempt === 1 && (await loadConfig()).targetType === "docker") {
    const start = Date.now();
    try {
      await clearAppCache();
      log.info("Login throttled — the throttle is cleared");
      return 0;
    } catch (e) {
      log.warn("Login throttled, and the throttle could not be cleared:", e);
    } finally {
      extendTestTimeout(Date.now() - start);
    }
  }
  return throttleWaitMs(headers);
}

/** The timeout of the hook or fixture running under `withTimeBudget`, if any. */
let ownBudgetMs: number | undefined;

/**
 * Runs `fn`, part of a hook or of a fixture with a timeout of its own, with that timeout set to
 * `budgetMs`. Playwright does not tell what the timeout of the running hook or fixture is, so
 * this is how `extendTestTimeout` knows what to add to.
 */
export async function withTimeBudget<T>(budgetMs: number, fn: () => Promise<T>) {
  base.info().setTimeout(budgetMs);
  ownBudgetMs = budgetMs;
  try {
    return await fn();
  } finally {
    ownBudgetMs = undefined;
  }
}

/**
 * Adds the time to the timeout of what is running — the test, or the hook or fixture that runs
 * under `withTimeBudget` — for a wait that is not its doing. Does nothing outside a test.
 */
export function extendTestTimeout(ms: number) {
  let info;
  try {
    info = base.info();
  } catch {
    return;
  }
  if (ownBudgetMs !== undefined) {
    ownBudgetMs += ms;
    info.setTimeout(ownBudgetMs);
  } else if (info.timeout) {
    // Outside the test's body this is still the timeout of the body, not of what is running.
    info.setTimeout(info.timeout + ms);
  }
}

export type Positions = Readonly<Record<string, string>>;
export type Dictionaries = Readonly<Record<string, Positions>>;

/**
 * Returns a proxy over `data` that throws on read of a missing key. Useful for catching typos in
 * dictionary/position lookups at the access site rather than producing `undefined` silently.
 */
function strict<V>(label: string, data: Record<string, V>): Readonly<Record<string, V>> {
  return new Proxy(data, {
    get(target, key) {
      if (typeof key !== "string" || key in target) {
        return target[key as keyof typeof target];
      }
      // The JS engine probes `.then` on values during Promise resolution to decide whether they
      // are thenable; report undefined so the proxy is treated as a plain value rather than
      // throwing here.
      if (key === "then") {
        return undefined;
      }
      throw new Error(`${label}: no such key "${key}". Available: ${Object.keys(target).join(", ") || "(none)"}.`);
    },
  });
}

let cachedDictionaries: Promise<Dictionaries> | undefined;

/**
 * Pads each meeting-client attendant with `clientGroupId: null` and `notifications: []` if
 * absent. The server's strict-key validator requires these keys on every `clients.*` entry, even
 * when their value is the obvious default; missing them fails with `validation.present`.
 */
function padAttendantClients(
  clients: readonly {
    userId: string;
    attendanceStatusDictId: string;
    clientGroupId?: string | null;
    notifications?: readonly {notificationMethodDictId: string}[];
    [k: string]: unknown;
  }[] = [],
) {
  return clients.map((c) => ({clientGroupId: null, notifications: [], ...c}));
}

interface CallOptions {
  readonly headers?: Readonly<Record<string, string>>;
  /**
   * If true, the call resolves with the response even on non-2xx status. Use in tests that
   * intentionally check error responses. Default is to throw {@link MemoAPIError}.
   */
  readonly allowFailure?: boolean;
}

/** A table query: the columns by name, and the rest as the endpoint takes it. */
export interface TQuery {
  readonly columns: readonly string[];
  readonly filter?: unknown;
  readonly sort?: readonly {readonly column: string; readonly desc?: boolean}[];
  readonly distinct?: boolean;
  /** The page size; a default large enough for the data of the tests. */
  readonly pageSize?: number;
}

/** Thrown by {@link MemoAPI} on non-ok responses (unless `allowFailure` is set). */
export class MemoAPIError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly response: APIResponse,
    readonly body: string,
  ) {
    super(`${method} ${response.url()} → ${response.status()}: ${body}`);
    this.name = "MemoAPIError";
  }
}

/** The outcome of a login request: the status, and the errors of a refused one. */
export interface LoginAttempt {
  readonly status: number;
  readonly errors: readonly {readonly field?: string; readonly code: string}[];
}

/**
 * Wraps an APIRequestContext with Memo-flavoured CSRF handling: captures `X-SET-CSRF-TOKEN` from
 * every response and replays it as `X-CSRF-TOKEN` on subsequent requests. Cookies are managed by
 * the underlying context. Paths are passed without the `/api/v1/` prefix. Non-ok responses throw
 * {@link MemoAPIError} unless `allowFailure: true` is passed.
 *
 * Use `MemoAPI.spawn(creds?)` for a self-owned instance (the spawn'd context is disposed by
 * `dispose()`); the bare constructor is for wrapping a caller-owned context (e.g. `page.request`)
 * — `dispose()` will only sweep child instances created via `loggedInAs`, not the wrapped context.
 */
export class MemoAPI {
  private readonly children: MemoAPI[] = [];

  private csrfToken: string | undefined;

  constructor(
    private api: APIRequestContext,
    private readonly baseURL: string,
    private readonly ownsCtx = false,
  ) {}

  /**
   * Creates a self-owned `MemoAPI` (its own request context + cookie jar) optionally logged in as
   * `creds`. The base URL is read from the e2e config — pass it explicitly only when overriding.
   */
  static async spawn(creds?: Credentials, baseURL?: string): Promise<MemoAPI> {
    const url = baseURL ?? (await loadConfig()).ui.baseURL;
    const ctx = await pwRequest.newContext({baseURL: url});
    const api = new MemoAPI(ctx, url, true);
    try {
      if (creds) {
        await api.login(creds);
      }
    } catch (e) {
      await api.dispose();
      throw e;
    }
    return api;
  }

  /**
   * Returns a sibling `MemoAPI` with its own request context (i.e. its own cookie jar and CSRF
   * state), logged in as `creds`. Tracked as a child of this instance — `dispose()` cleans it up.
   */
  async loggedInAs(creds: Credentials): Promise<MemoAPI> {
    const child = await MemoAPI.spawn(creds, this.baseURL);
    this.children.push(child);
    return child;
  }

  /**
   * Sends a login request from a session of its own, which is then dropped, and returns the
   * outcome instead of throwing. Does not use the session cache, and gets past the throttle.
   * For tests of the login itself; `otp` is the one-time password, if any is to be sent.
   */
  static async attemptLogin({email, password, otp}: Credentials & {readonly otp?: string}): Promise<LoginAttempt> {
    const session = await MemoAPI.spawn();
    try {
      const res = await session.postLoginWithThrottleRetry({email, password, ...(otp === undefined ? {} : {otp})});
      const errors = res.ok() ? [] : ((await res.json()) as {errors?: LoginAttempt["errors"]}).errors || [];
      return {status: res.status(), errors};
    } finally {
      await session.dispose();
    }
  }

  async dispose(): Promise<void> {
    await Promise.allSettled(this.children.map((c) => c.dispose()));
    this.children.length = 0;
    if (this.ownsCtx) {
      await this.api.dispose();
    }
  }

  async get(path: string, options?: CallOptions) {
    return this.call("GET", path, options);
  }

  async post(path: string, data?: unknown, options?: CallOptions) {
    return this.call("POST", path, options, data);
  }

  async put(path: string, data?: unknown, options?: CallOptions) {
    return this.call("PUT", path, options, data);
  }

  async patch(path: string, data?: unknown, options?: CallOptions) {
    return this.call("PATCH", path, options, data);
  }

  async delete(path: string, data?: unknown, options?: CallOptions) {
    return this.call("DELETE", path, options, data);
  }

  /** GETs the path and returns the `data` of the response. */
  async getData<T>(path: string): Promise<T> {
    return ((await (await this.get(path)).json()) as {data: T}).data;
  }

  /** Returns the resources of the given ids, from a `<resource>/list` endpoint. */
  async list<T>(resource: string, ids: string | readonly string[]): Promise<readonly T[]> {
    return this.getData(`${resource}/list?in=${typeof ids === "string" ? ids : ids.join(",")}`);
  }

  /** Runs a table query on a `…/tquery` endpoint; returns a page of rows and the count of all. */
  async tquery<R = Record<string, unknown>>(
    path: string,
    {columns, sort, pageSize = 1000, ...rest}: TQuery,
  ): Promise<{readonly rows: readonly R[]; readonly total: number}> {
    const res = await this.post(path, {
      columns: columns.map((column) => ({type: "column", column})),
      ...(sort ? {sort: sort.map((s) => ({type: "column", ...s}))} : {}),
      paging: {size: pageSize},
      ...rest,
    });
    const {data, meta} = (await res.json()) as {data: readonly R[]; meta: {totalDataSize: number}};
    return {rows: data, total: meta.totalDataSize};
  }

  /**
   * Logs in as `creds`. Consults the on-disk session cache first; if a jar exists for this server
   * and email and we own the underlying context, swaps to a fresh context preloaded with those
   * cookies and skips the login POST. Otherwise posts to `user/login` and writes the resulting
   * cookies through to the cache. This minimises hits on the rate-limited login endpoint.
   */
  async login(creds: Credentials): Promise<void> {
    const cached = await sessions.get(this.baseURL, creds.email);
    if (cached && this.ownsCtx) {
      const oldCtx = this.api;
      const newCtx = await pwRequest.newContext({
        baseURL: this.baseURL,
        storageState: {cookies: [...cached], origins: []},
      });
      // Validate the cached session — Memo invalidates sessions on password change, app key
      // rotation, and storage cleanup; a stale cache must fall back to a real login. A
      // bare /user/status GET will return 401 if the session is no longer authenticated.
      let probeOk;
      try {
        probeOk = (await newCtx.fetch(`/api/v1/user/status`, {method: "GET"})).ok();
      } catch (e) {
        await newCtx.dispose();
        throw e;
      }
      if (probeOk) {
        this.api = newCtx;
        this.csrfToken = undefined;
        await oldCtx.dispose();
        return;
      }
      await newCtx.dispose();
      await sessions.forget(this.baseURL, creds.email);
    }
    const res = await this.postLoginWithThrottleRetry(creds);
    if (!res.ok()) {
      throw new MemoAPIError("POST", "user/login", res, await res.text());
    }
    const state = await this.api.storageState();
    await sessions.set(this.baseURL, creds.email, state.cookies);
  }

  /**
   * POSTs `user/login` with retry on 429, and returns the first other response. Memo rate-limits
   * the login route at 5 hits/minute per IP (`throttle:5,1,api_login`); bursts during test setup
   * (multiple users) commonly hit it. Clears the throttle where that can be done, and otherwise
   * waits for as long as the throttled response says, until the response is non-429 or the total
   * budget runs out (≥ the 60s decay window, so the bucket is guaranteed to refill at least once).
   * The waits are added to the timeout of the running test.
   *
   * If a test wants to *exercise* the throttle (e.g. assert 429 itself), bypass this by calling
   * `api.post("user/login", ..., {allowFailure: true})` directly.
   */
  private async postLoginWithThrottleRetry(
    creds: Credentials & {readonly otp?: string},
    {totalTimeoutMs = 90_000}: {totalTimeoutMs?: number} = {},
  ): Promise<APIResponse> {
    const start = Date.now();
    for (let attempt = 1; ; attempt++) {
      const res = await this.post("user/login", creds, {allowFailure: true});
      if (res.status() !== 429) {
        return res;
      }
      const waitMs = await loginThrottleWaitMs(res.headers(), attempt);
      const elapsed = Date.now() - start;
      if (elapsed + waitMs > totalTimeoutMs) {
        throw new MemoAPIError("POST", "user/login", res, await res.text());
      }
      if (waitMs) {
        log.warn(
          `[MemoAPI] /user/login throttled (attempt ${attempt}, ${Math.round(elapsed / 1000)}s in) — waiting ${waitMs}ms`,
        );
      }
      extendTestTimeout(waitMs);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  async createFacility(args: {name: string; url: string; [k: string]: unknown}, options?: CallOptions) {
    return this.post("admin/facility", args, options);
  }

  async createUser(args: {name: string; [k: string]: unknown}, options?: CallOptions) {
    return this.post(
      "admin/user",
      {
        email: null,
        password: null,
        hasEmailVerified: false,
        passwordExpireAt: null,
        otpRequiredAt: null,
        hasGlobalAdmin: false,
        ...args,
      },
      options,
    );
  }

  async createMember(args: {userId: string; facilityId: string; [k: string]: unknown}, options?: CallOptions) {
    return this.post(
      "admin/member",
      {
        hasFacilityAdmin: false,
        isFacilityClient: false,
        isFacilityStaff: false,
        isActiveFacilityStaff: false,
        ...args,
      },
      options,
    );
  }

  async createFacilityClient(
    facilityId: string,
    args: {
      name: string;
      client: {typeDictId: string; [k: string]: unknown};
      [k: string]: unknown;
    },
    options?: CallOptions,
  ) {
    return this.post(
      `facility/${facilityId}/user/client`,
      {
        ...args,
        client: {
          shortCode: null,
          genderDictId: null,
          notes: null,
          urgentNotes: null,
          birthDate: null,
          contactEmail: null,
          contactPhone: null,
          addressStreetNumber: null,
          addressPostalCode: null,
          addressCity: null,
          contactStartAt: null,
          contactEndAt: null,
          documentsLinks: null,
          notificationMethodDictIds: null,
          ...args.client,
        },
      },
      options,
    );
  }

  async createClientGroup(
    facilityId: string,
    args: {
      clients: readonly {userId: string; role?: string | null; [k: string]: unknown}[];
      [k: string]: unknown;
    },
    options?: CallOptions,
  ) {
    return this.post(`facility/${facilityId}/client-group`, {notes: null, ...args}, options);
  }

  async createMeeting(
    facilityId: string,
    args: {
      typeDictId: string;
      date: string;
      startDayminute: number;
      durationMinutes: number;
      statusDictId: string;
      isRemote?: boolean;
      staff?: readonly {userId: string; attendanceStatusDictId: string; [k: string]: unknown}[];
      clients?: readonly {
        userId: string;
        attendanceStatusDictId: string;
        clientGroupId?: string | null;
        notifications?: readonly {notificationMethodDictId: string}[];
        [k: string]: unknown;
      }[];
      [k: string]: unknown;
    },
    options?: CallOptions,
  ) {
    return this.post(
      `facility/${facilityId}/meeting`,
      {notes: null, isRemote: false, staff: [], resources: [], ...args, clients: padAttendantClients(args.clients)},
      options,
    );
  }

  /**
   * PATCH a meeting. Mirrors {@link createMeeting}'s padding: each `clients.*` entry is padded
   * with `clientGroupId: null` and `notifications: []` if missing. Use this instead of `patch()`
   * when the body sets `clients` or `staff` — the server's strict-key validator rejects entries
   * without these fields with `validation.present`.
   */
  async patchMeeting(
    facilityId: string,
    meetingId: string,
    args: {
      staff?: readonly {userId: string; attendanceStatusDictId: string; [k: string]: unknown}[];
      clients?: readonly {
        userId: string;
        attendanceStatusDictId: string;
        clientGroupId?: string | null;
        notifications?: readonly {notificationMethodDictId: string}[];
        [k: string]: unknown;
      }[];
      [k: string]: unknown;
    },
    options?: CallOptions,
  ) {
    const patch: Record<string, unknown> = {...args};
    if (args.clients !== undefined) {
      patch.clients = padAttendantClients(args.clients);
    }
    return this.patch(`facility/${facilityId}/meeting/${meetingId}`, patch, options);
  }

  /** The id of the dictionary of the given name. */
  async dictionaryId(name: string) {
    const dictionaries = await this.getData<readonly {id: string; name: string}[]>("system/dictionary/list");
    const dictionary = dictionaries.find((d) => d.name === name);
    if (!dictionary) {
      throw new Error(`Dictionary "${name}" not found`);
    }
    return dictionary.id;
  }

  /**
   * Returns the fixed dictionaries with their fixed positions, as a strict map
   * `dictName → {positionName → id}`. Accessing a missing dictionary or position throws.
   *
   * The endpoint is public (`Permission::any`) and a GET, so no login or CSRF priming is needed.
   * Cached process-wide on first call — every `MemoAPI` instance shares the same result.
   */
  async dictionaries(): Promise<Dictionaries> {
    if (cachedDictionaries === undefined) {
      cachedDictionaries = this.fetchDictionaries().catch((e) => {
        cachedDictionaries = undefined;
        throw e;
      });
    }
    return cachedDictionaries;
  }

  private async fetchDictionaries(): Promise<Dictionaries> {
    const res = await this.get("system/dictionary/list");
    const body = (await res.json()) as {
      data: readonly {
        readonly name: string;
        readonly isFixed: boolean;
        readonly positions: readonly {readonly name: string; readonly isFixed: boolean; readonly id: string}[];
      }[];
    };
    const dicts: Record<string, Positions> = {};
    for (const dict of body.data) {
      if (!dict.isFixed) {
        continue;
      }
      const positions: Record<string, string> = {};
      for (const pos of dict.positions) {
        if (pos.isFixed) {
          positions[pos.name] = pos.id;
        }
      }
      dicts[dict.name] = strict(`dictionary "${dict.name}" position`, positions);
    }
    return strict("dictionary", dicts);
  }

  private async call(method: string, path: string, options?: CallOptions, data?: unknown) {
    if (!this.csrfToken && method !== "GET") {
      // Just seeds the CSRF cookie; the response status doesn't matter (returns 401 when not
      // logged in).
      await this.get("user/status", {allowFailure: true});
    }
    const headers: Record<string, string> = {Accept: "application/json", ...options?.headers};
    if (data !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (this.csrfToken) {
      headers["X-CSRF-TOKEN"] = this.csrfToken;
    }
    const res = await this.api.fetch(`/api/v1/${path}`, {method, headers, data});
    const newCsrf = res.headers()["x-set-csrf-token"];
    if (newCsrf) {
      this.csrfToken = newCsrf;
    }
    if (!options?.allowFailure && !res.ok()) {
      throw new MemoAPIError(method, path, res, await res.text());
    }
    return res;
  }
}
