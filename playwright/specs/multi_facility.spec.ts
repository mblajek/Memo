import type {Page} from "@playwright/test";
import {loadConfig} from "../lib/config.ts";
import {FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {OTHER_FACILITY, secondFacilityLayer} from "../lib/layers/second_facility.ts";
import {expect, login, openPage, readOnlyTest, test} from "../lib/test.ts";
import {responseData} from "../lib/responses.ts";
import {lastLoginFacilityId} from "../helpers/queries.ts";

secondFacilityLayer.describe((artifact) => {
  readOnlyTest("non-member gets 403 from another facility's API", async ({api}) => {
    const {facilityId, otherFacilityId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const query = {columns: [{type: "column", column: "id"}], paging: {size: 1}};
    const denied = await staffApi.post(`facility/${otherFacilityId}/user/tquery`, query, {allowFailure: true});
    expect(denied.status()).toBe(403);
    const status = await staffApi.get(`user/status/${otherFacilityId}`);
    const {permissions} = await responseData<{permissions: Record<string, unknown>}>(status);
    expect(permissions).toMatchObject({facilityMember: false, facilityStaff: false, facilityAdmin: false});
    // Guard: the very same request is fine for the user's own facility.
    const allowed = await staffApi.post(`facility/${facilityId}/user/tquery`, query);
    expect(allowed.status()).toBe(200);
  });

  readOnlyTest("non-member opening another facility's URL does not see that facility", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${OTHER_FACILITY.url}/calendar`, STAFF);
    // The header keeps showing the user's own facility, as plain text — there is nothing to
    // switch to.
    const header = page.getByRole("banner");
    await expect(header.getByText(FACILITY.name, {exact: true})).toBeVisible();
    await expect(header.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText(OTHER_FACILITY.name)).toHaveCount(0);
    // Whatever the sidebar offers leads to the user's own facility.
    const nav = page.getByRole("navigation");
    await expect(nav.locator(`a[href="/${FACILITY.url}/calendar"]`)).toBeVisible();
    await expect(nav.locator(`a[href^="/${OTHER_FACILITY.url}/"]`)).toHaveCount(0);
  });

  readOnlyTest(
    "non-member opening another facility's URL is told about the lack of access",
    {tag: "@ui"},
    async ({page}) => {
      await login(page, STAFF);
      for (const path of ["calendar", "home", "admin/time-tables"]) {
        await openPage(page, `/${OTHER_FACILITY.url}/${path}`);
        await expect(page.getByText("no_permissions_to_view")).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/${OTHER_FACILITY.url}/${path}$`));
      }
      // Guard: the denial concerns the other facility only.
      await openPage(page, `/${FACILITY.url}/calendar`);
      await expect(page.getByRole("navigation").locator(`a[href="/${FACILITY.url}/calendar"]`)).toBeVisible();
      await expect(page.getByText("no_permissions_to_view")).toHaveCount(0);
    },
  );

  readOnlyTest(
    "non-member opening a nonexistent facility's URL gets not-found, not a denial",
    {tag: "@ui"},
    async ({page}) => {
      await openPage(page, "/int-test-nonexistent/calendar", STAFF);
      await expect(page.getByText("errors.page_not_found.title")).toBeVisible();
      await expect(page.getByText("no_permissions_to_view")).toHaveCount(0);
    },
  );

  readOnlyTest("global admin who is not a member is denied on both facilities' URLs", {tag: "@ui"}, async ({page}) => {
    const cfg = await loadConfig();
    await login(page, cfg.ui.admin);
    for (const facility of [FACILITY, OTHER_FACILITY]) {
      await openPage(page, `/${facility.url}/calendar`);
      await expect(page.getByText("no_permissions_to_view")).toBeVisible();
      await expect(page.getByText(facility.name)).toHaveCount(0);
    }
  });

  // Not read-only: opening the other facility's URL changes `lastLoginFacilityId`.
  test("member of two facilities has the permissions of the facility in the URL", {tag: "@ui"}, async ({page}) => {
    // STAFF_ADMIN is a facility admin in the first facility only.
    await openPage(page, `/${OTHER_FACILITY.url}/admin/time-tables`, STAFF_ADMIN);
    await expect(page.getByRole("banner").getByRole("combobox")).toContainText(OTHER_FACILITY.name);
    await expect(page.getByText("no_permissions_to_view")).toBeVisible();
    await openPage(page, `/${OTHER_FACILITY.url}/calendar`);
    await expect(page.getByRole("navigation").locator(`a[href="/${OTHER_FACILITY.url}/calendar"]`)).toBeVisible();
    await expect(page.getByText("no_permissions_to_view")).toHaveCount(0);
  });

  readOnlyTest("facility selector lists both facilities for a member of two", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/calendar`, STAFF_ADMIN);
    const selector = page.getByRole("banner").getByRole("combobox");
    await expect(selector).toContainText(FACILITY.name);
    await selector.click();
    await expect(page.getByRole("option")).toHaveText([FACILITY.name, OTHER_FACILITY.name]);
  });

  test(
    "switching the facility in the selector loads the other facility's URL",
    {tag: "@ui"},
    async ({page, pageApi}) => {
      const {facilityId, otherFacilityId} = artifact();
      await openPage(page, `/${FACILITY.url}/calendar`, STAFF_ADMIN);
      expect(await lastLoginFacilityId(pageApi)).toBe(facilityId);

      const selector = page.getByRole("banner").getByRole("combobox");
      await selector.click();
      await page.getByRole("option", {name: OTHER_FACILITY.name}).click();

      await expect(page).toHaveURL(new RegExp(`/${OTHER_FACILITY.url}/calendar$`));
      await expect(selector).toContainText(OTHER_FACILITY.name);
      await expect.poll(() => lastLoginFacilityId(pageApi)).toBe(otherFacilityId);

      // The choice is remembered: the root URL now leads to the other facility.
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`/${OTHER_FACILITY.url}/calendar$`));
    },
  );

  test(
    "opening the other facility's URL directly makes it the active facility",
    {tag: "@ui"},
    async ({page, pageApi}) => {
      const {otherFacilityId} = artifact();
      await openPage(page, `/${OTHER_FACILITY.url}/staff`, STAFF_ADMIN);
      await expect(page.getByRole("banner").getByRole("combobox")).toContainText(OTHER_FACILITY.name);
      // STAFF_ADMIN is a facility admin only in the first facility, so no admin section here.
      const nav = page.getByRole("navigation");
      await expect(nav.locator(`a[href="/${OTHER_FACILITY.url}/admin/time-tables"]`)).toHaveCount(0);
      await expect(nav.locator(`a[href="/${OTHER_FACILITY.url}/calendar"]`)).toBeVisible();
      await expect.poll(() => lastLoginFacilityId(pageApi)).toBe(otherFacilityId);
    },
  );

  // Not read-only: sets an icon, and opening the other facility's URL changes `lastLoginFacilityId`.
  test("each tab shows the icon of its own facility", {tag: "@ui"}, async ({page, globalAdminApi}) => {
    const {facilityId, otherFacilityId} = artifact();
    const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><circle cx="1" cy="1" r="1"/></svg>';
    await globalAdminApi.patch(`admin/facility/${otherFacilityId}`, {iconSvg: icon});
    const logoIcon = (ofPage: Page) => ofPage.locator('image:not([href="/img/memo_logo.svg"])').first();
    const defaultIconHref = "/img/cpd_children_logo.svg";
    const otherIconHref = new RegExp(`^/api/v1/system/facility/${otherFacilityId}/icon\\?h=\\w+$`);
    /** The stored facility to take the icon from when no facility is active. */
    const rememberedIcon = () => page.evaluate(() => localStorage.getItem("persistence:FacilityIcon"));

    await openPage(page, `/${FACILITY.url}/calendar`, STAFF_ADMIN);
    await expect(page.getByRole("banner").getByRole("combobox")).toContainText(FACILITY.name);
    await expect(logoIcon(page)).toHaveAttribute("href", defaultIconHref);
    await expect.poll(rememberedIcon).toContain(facilityId);

    const otherPage = await page.context().newPage();
    await openPage(otherPage, `/${OTHER_FACILITY.url}/calendar`);
    await expect(logoIcon(otherPage)).toHaveAttribute("href", otherIconHref);
    // The browser remembers the icon of the facility opened last, and the first tab keeps its own.
    await expect.poll(rememberedIcon).toContain(otherFacilityId);
    await expect(logoIcon(page)).toHaveAttribute("href", defaultIconHref);

    // The facility of the tab wins over the remembered one also when the tab loads anew.
    await page.reload();
    await expect(page.getByRole("banner").getByRole("combobox")).toContainText(FACILITY.name);
    await expect(logoIcon(page)).toHaveAttribute("href", defaultIconHref);
    await expect.poll(rememberedIcon).toContain(facilityId);
    await expect(logoIcon(otherPage)).toHaveAttribute("href", otherIconHref);

    // Switching the facility in the selector brings its icon.
    const selector = page.getByRole("banner").getByRole("combobox");
    await selector.click();
    await page.getByRole("option", {name: OTHER_FACILITY.name}).click();
    await expect(page).toHaveURL(new RegExp(`/${OTHER_FACILITY.url}/calendar$`));
    await expect(logoIcon(page)).toHaveAttribute("href", otherIconHref);
  });
});
