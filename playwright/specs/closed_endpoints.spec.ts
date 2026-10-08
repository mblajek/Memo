import {ADMIN, BARE_MEMBER, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {MemoAPI, expect, readOnlyTest} from "../lib/test.ts";

/**
 * Endpoints of the developer and of the global admin, asked by those who must not use them.
 * Only requests that would be harmless if let through are sent: reads, and the migration status
 * (the migration itself runs only when given the hash of that status).
 */

type Request = readonly ["GET" | "POST", string];

const DEVELOPER_ONLY: readonly Request[] = [
  ["GET", "admin/developer/migrate"],
  ["GET", "admin/developer/log/tquery"],
  ["POST", "admin/developer/log/tquery"],
];
const GLOBAL_ADMIN_ONLY: readonly Request[] = [
  ["GET", "admin/db-dump/tquery"],
  ["POST", "admin/db-dump/tquery"],
  ["GET", "admin/user/tquery"],
  ["GET", "admin/facility/tquery"],
];
/** Open to any logged-in user. No request body: a valid one would send a mail, or write a log. */
const LOGGED_IN_ONLY: readonly Request[] = [
  ["POST", "mail/test"],
  ["POST", "system/log"],
];

async function status(api: MemoAPI, [method, path]: Request) {
  const res =
    method === "GET" ? await api.get(path, {allowFailure: true}) : await api.post(path, {}, {allowFailure: true});
  return res.status();
}

async function expectStatus(api: MemoAPI, who: string, requests: readonly Request[], expected: number) {
  for (const request of requests) {
    expect.soft(await status(api, request), `${who}: ${request.join(" ")}`).toBe(expected);
  }
}

facilityLayer.describe(() => {
  readOnlyTest("developer and global admin endpoints answer 401 to an anonymous request", async ({api}) => {
    await expectStatus(api, "anonymous", [...DEVELOPER_ONLY, ...GLOBAL_ADMIN_ONLY, ...LOGGED_IN_ONLY], 401);
  });

  readOnlyTest("developer and global admin endpoints answer 403 to every facility role", async ({api}) => {
    for (const user of [STAFF, ADMIN, STAFF_ADMIN, BARE_MEMBER]) {
      const userApi = await api.loggedInAs(user);
      await expectStatus(userApi, user.name, [...DEVELOPER_ONLY, ...GLOBAL_ADMIN_ONLY], 403);
    }
  });

  readOnlyTest(
    "developer endpoints answer 403 to a global admin without the developer permission",
    async ({globalAdminApi}) => {
      await expectStatus(globalAdminApi, "global admin", DEVELOPER_ONLY, 403);
      // Guard: the same session is let into the global admin's own endpoints.
      await expectStatus(
        globalAdminApi,
        "global admin",
        GLOBAL_ADMIN_ONLY.filter(([method]) => method === "GET"),
        200,
      );
    },
  );

  readOnlyTest("a log entry with no content is refused", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    expect(await status(staffApi, ["POST", "system/log"])).toBe(400);
  });
});
