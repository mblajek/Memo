import {ADMIN, FACILITY, STAFF, facilityLayer} from "../lib/layers/facility.ts";
import {expect, openPage, readOnlyTest} from "../lib/test.ts";

/** The facility admin's notifications list. The seeded facility has sent no notifications. */

facilityLayer.describe((artifact) => {
  readOnlyTest("facility admin views the notifications page", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/admin/notifications`, ADMIN);
    const main = page.locator("main");
    for (const mode of ["all", "future", "past"]) {
      await expect(main.getByRole("tab", {name: `tables.tables.notification.mode.${mode}`})).toBeVisible();
    }
    for (const column of ["scheduledAt", "status", "address", "subject"]) {
      await expect(main.getByRole("button", {name: `tables.tables.notification.column_names.${column}`})).toBeVisible();
    }
    await expect(main.getByText("tables.tables.notification.summary{count:0}")).toBeVisible();
    await main.getByRole("tab", {name: "tables.tables.notification.mode.future"}).click();
    await expect(main.getByRole("tab", {name: "tables.tables.notification.mode.future"})).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(main.getByText("tables.tables.notification.summary{count:0}")).toBeVisible();
  });

  readOnlyTest("notifications tquery is open to facility admins only", async ({api}) => {
    const {facilityId} = artifact();
    const path = `facility/${facilityId}/notification/tquery`;
    const adminApi = await api.loggedInAs(ADMIN);
    const config = (await (await adminApi.get(path)).json()) as {columns: readonly {name: string}[]};
    expect(config.columns.map((c) => c.name)).toEqual(expect.arrayContaining(["scheduledAt", "status", "subject"]));
    expect((await adminApi.tquery(path, {columns: ["id"]})).total).toBe(0);
    const staffApi = await api.loggedInAs(STAFF);
    expect((await staffApi.get(path, {allowFailure: true})).status()).toBe(403);
    expect((await staffApi.post(path, {columns: [], paging: {size: 1}}, {allowFailure: true})).status()).toBe(403);
  });
});
