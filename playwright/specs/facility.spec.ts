import {expectValidationErrors} from "../lib/responses.ts";
import {loadConfig} from "../lib/config.ts";
import {ADMIN, BARE_MEMBER, FACILITY, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {expect, login, openPage, readOnlyTest, test} from "../lib/test.ts";

facilityLayer.describe(() => {
  readOnlyTest("logged-in staff sees the facility name", {tag: "@ui"}, async ({page}) => {
    await openPage(page, "/", STAFF);
    await expect(page.getByText(FACILITY.name)).toBeVisible();
  });

  readOnlyTest("staff visiting /facility/home is forwarded to /calendar", {tag: "@ui"}, async ({page}) => {
    // FacilityHomePage immediately Navigates to /{facility}/calendar.
    await openPage(page, `/${FACILITY.url}/home`, STAFF);
    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/calendar$`));
    await expect(page.getByText(FACILITY.name)).toBeVisible();
  });

  readOnlyTest("staff blocked from facility-admin pages", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/admin/time-tables/weekly`, STAFF);
    await expect(page.getByText("no_permissions_to_view")).toBeVisible();
  });

  for (const [label, creds] of Object.entries({STAFF, ADMIN, STAFF_ADMIN, BARE_MEMBER})) {
    readOnlyTest(`user-settings popover lists expected actions for ${label}`, {tag: "@ui"}, async ({page}) => {
      await openPage(page, "/help", creds);
      await page.locator("title=user_settings").click();
      await expect(page.getByRole("button", {name: "actions.change_password"})).toBeVisible();
      await expect(page.getByRole("button", {name: /actions\.configure_otp/})).toBeEnabled();
      await expect(page.getByRole("button", {name: "switch_theme"})).toBeVisible();
      await expect(page.getByRole("button", {name: "actions.log_out"})).toBeVisible();
      // The developer controls are for global admins who asked for the permission.
      await expect(page.locator("title=Developer permission")).toHaveCount(0);
    });
  }

  /**
   * The sidebar's facility links by role. The first group is for facility staff or admins, the
   * second for facility admins only; a member with neither role has no active facility at all.
   */
  const STAFF_OR_ADMIN_LINKS = ["calendar", "staff", "clients", "admins"] as const;
  const ADMIN_LINKS = ["admin/time-tables", "admin/reports"] as const;
  const SIDEBAR_ROLES = [
    {label: "STAFF", creds: STAFF, staffOrAdmin: true, admin: false},
    {label: "ADMIN", creds: ADMIN, staffOrAdmin: true, admin: true},
    {label: "STAFF_ADMIN", creds: STAFF_ADMIN, staffOrAdmin: true, admin: true},
    {label: "BARE_MEMBER", creds: BARE_MEMBER, staffOrAdmin: false, admin: false},
  ] as const;
  for (const {label, creds, staffOrAdmin, admin} of SIDEBAR_ROLES) {
    readOnlyTest(`sidebar shows the facility links matching the role: ${label}`, {tag: "@ui"}, async ({page}) => {
      await openPage(page, "/help", creds);
      const nav = page.getByRole("navigation");
      const link = (path: string) => nav.locator(`a[href="/${FACILITY.url}/${path}"]`);
      // The help link is there for everybody, and it shows the sidebar has rendered.
      await expect(nav.locator('a[href="/help"]')).toBeVisible();
      // The user status decides about the links, wait for it.
      await expect(page.getByText(creds.name)).toBeVisible();
      // A link with a submenu is there twice, hence `first()`.
      for (const path of STAFF_OR_ADMIN_LINKS) {
        await (staffOrAdmin ? expect(link(path).first()).toBeVisible() : expect(link(path)).toHaveCount(0));
      }
      for (const path of ADMIN_LINKS) {
        await (admin ? expect(link(path).first()).toBeVisible() : expect(link(path)).toHaveCount(0));
      }
      await expect(nav.locator('a[href="/admin/facilities"]')).toHaveCount(0);
      await expect(nav.locator('a[href="/admin/users"]')).toHaveCount(0);
    });
  }

  readOnlyTest(
    "sidebar of a global admin outside any facility has the global admin links only",
    {tag: "@ui"},
    async ({page}) => {
      const cfg = await loadConfig();
      await openPage(page, "/help", cfg.ui.admin);
      const nav = page.getByRole("navigation");
      await expect(nav.locator('a[href="/admin/facilities"]')).toBeVisible();
      await expect(nav.locator('a[href="/admin/users"]')).toBeVisible();
      await expect(nav.locator(`a[href^="/${FACILITY.url}/"]`)).toHaveCount(0);
    },
  );

  readOnlyTest("theme toggle in the user-settings popover persists across reloads", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/calendar`, STAFF);
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/\bdark\b/);
    await page.locator("title=user_settings").click();
    await page.getByRole("button", {name: "switch_theme"}).click();
    await expect(html).toHaveClass(/\bdark\b/);

    await page.reload();
    await disableTranslations(page);
    await expect(html).toHaveClass(/\bdark\b/);

    await page.locator("title=user_settings").click();
    await page.getByRole("button", {name: "switch_theme"}).click();
    await expect(html).not.toHaveClass(/\bdark\b/);
    await page.reload();
    await disableTranslations(page);
    await expect(page.locator("title=user_settings")).toBeVisible();
    await expect(html).not.toHaveClass(/\bdark\b/);
  });

  readOnlyTest("switching to the testing language turns the visible labels into keys", {tag: "@ui"}, async ({page}) => {
    await login(page, STAFF);
    await page.goto(`/${FACILITY.url}/calendar`);
    const nav = page.getByRole("navigation");
    const facilityLinks = nav.locator(`a[href^="/${FACILITY.url}/"]`);
    // In the default language, the labels are real text and no translation key shows through.
    await expect(facilityLinks.first()).toBeVisible();
    await expect(nav.getByText(/routes\./i)).toHaveCount(0);
    await expect(page.locator("title=user_settings")).toHaveCount(0);

    await disableTranslations(page);
    await expect(page.locator("title=user_settings")).toBeVisible();
    await expect(nav.locator('a[href="/help"]')).toHaveText(/^\s*routes\.help\s*$/i);
    await expect(facilityLinks).not.toHaveCount(0);
    for (const text of await facilityLinks.allInnerTexts()) {
      expect(text.trim()).toMatch(/^routes\.facility\.[a-z_.]+$/i);
    }
    await page.locator("title=user_settings").click();
    await expect(page.getByRole("button", {name: "actions.log_out"})).toBeVisible();
  });

  readOnlyTest("developer login request from a non-global-admin is not honoured", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    // Without global admin the `developer` field is not even looked at: the request is validated
    // as an ordinary login, which fails for the lack of credentials.
    const res = await staffApi.post("user/login", {developer: true}, {allowFailure: true});
    await expectValidationErrors(res, [
      {field: "email", code: "validation.present"},
      {field: "password", code: "validation.present"},
    ]);
    const {permissions} = await staffApi.getData<{permissions: {developer: boolean}}>("user/status");
    expect(permissions.developer).toBe(false);
  });

  test(
    "global admin changes the facility URL; the old URL is not found, the new one works",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId} = facilityLayer.getArtifact();
      const newUrl = "int-test-moved";
      await globalAdminApi.patch(`admin/facility/${facilityId}`, {url: newUrl});

      await openPage(page, `/${FACILITY.url}/calendar`, STAFF);
      await expect(page.getByText("errors.page_not_found.title")).toBeVisible();

      await openPage(page, `/${newUrl}/calendar`);
      await expect(page.getByText("errors.page_not_found.title")).toHaveCount(0);
      await expect(page.getByText(FACILITY.name)).toBeVisible();
      await expect(page.getByRole("navigation").locator(`a[href="/${newUrl}/calendar"]`)).toBeVisible();
      // The root URL follows the facility too.
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`/${newUrl}/calendar$`));
    },
  );

  readOnlyTest("member tquery returns the facility's members, the global admins and the system user", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const facilityId = facilityLayer.getArtifact().facilityId;
    const {rows} = await staffApi.tquery<Record<string, string | boolean>>(`facility/${facilityId}/user/tquery`, {
      columns: ["name", "hasGlobalAdmin", "member.isStaff", "member.hasFacilityAdmin"],
    });
    const roles = (name: string) => {
      const matching = rows.filter((row) => row.name === name);
      expect(matching, name).toHaveLength(1);
      return [matching[0]!["member.isStaff"] && "staff", matching[0]!["member.hasFacilityAdmin"] && "admin"]
        .filter(Boolean)
        .join("+");
    };
    expect(roles(STAFF.name)).toBe("staff");
    expect(roles(ADMIN.name)).toBe("admin");
    expect(roles(STAFF_ADMIN.name)).toBe("staff+admin");
    expect(roles(BARE_MEMBER.name)).toBe("");
    // Whoever else is listed is not of this facility: a global admin, or the system user.
    const seeded: readonly string[] = [STAFF.name, ADMIN.name, STAFF_ADMIN.name, BARE_MEMBER.name];
    const others = rows.filter((row) => !seeded.includes(row.name as string));
    expect(others.filter((row) => !row.hasGlobalAdmin).map((row) => row.name)).toEqual(["system"]);
    expect(others.filter((row) => row.hasGlobalAdmin).length).toBeGreaterThan(0);
    for (const row of others) {
      expect([row.name, row["member.isStaff"], row["member.hasFacilityAdmin"]]).toEqual([row.name, false, false]);
    }
  });

  readOnlyTest("staff patching the facility returns 403", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const facilityId = facilityLayer.getArtifact().facilityId;
    const res = await staffApi.patch(`admin/facility/${facilityId}`, {name: "Hijacked"}, {allowFailure: true});
    expect(res.status()).toBe(403);
  });

  readOnlyTest("system facility list endpoint returns the test facility", async ({globalAdminApi}) => {
    const data = await globalAdminApi.getData<readonly {url: string; name: string}[]>("system/facility/list");
    expect(data.some((f) => f.url === FACILITY.url && f.name === FACILITY.name)).toBe(true);
  });
});
