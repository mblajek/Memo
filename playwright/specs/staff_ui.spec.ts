import {SHOWN_TABLE_TIME, daysFromNow, shownDateTime} from "../helpers/dates.ts";
import {storageKeys, storageValue, userAccount, userName} from "../helpers/queries.ts";
import {DateTime} from "luxon";
import {ADMIN, BARE_MEMBER, FACILITY, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {
  columnChooserBox,
  columnHeader,
  expectFormSuccess,
  expectSectionShown,
  formField,
  showTableColumns,
  submitButton,
  tableCellTexts,
  tableRows,
} from "../helpers/selectors.ts";
import {createdId} from "../lib/responses.ts";
import {MemoAPI, expect, openPage, readOnlyTest, test} from "../lib/test.ts";

/** The staff list and the staff details form, which only a facility admin can edit. */

facilityLayer.describe((artifact) => {
  test(
    "ADMIN toggles STAFF's isActive off; the deactivatedAt field appears and is saved",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId} = artifact();
      await openPage(page, `/${FACILITY.url}/staff/${staffUserId}`, ADMIN);

      await page.locator("form#staff_edit").getByRole("button", {name: "actions.edit"}).click();

      const isActive = formField(page, "staff.isActive");
      await expect(isActive).toBeChecked();
      const deactivatedAt = formField(page, "staff.deactivatedAt");
      await expectSectionShown(deactivatedAt, false);
      await isActive.click();
      await expectSectionShown(deactivatedAt, true);
      await deactivatedAt.fill("2020-01-01T08:00");

      await submitButton(page, "staff_edit").click();
      await expectFormSuccess(page, "staff_edit");

      const adminApi = await api.loggedInAs(ADMIN);
      const data = await adminApi.list<{staff: {deactivatedAt: string | null}}>(
        `facility/${facilityId}/user/staff`,
        staffUserId,
      );
      // The time typed, a local one, as the moment it is.
      expect(DateTime.fromISO(data[0]!.staff.deactivatedAt!).toMillis()).toBe(
        DateTime.fromISO("2020-01-01T08:00").toMillis(),
      );
    },
  );

  readOnlyTest(
    "plain STAFF visiting the staff details page does NOT see an Edit button",
    {tag: "@ui"},
    async ({page}) => {
      const {staffAdminUserId} = artifact();
      await openPage(page, `/${FACILITY.url}/staff/${staffAdminUserId}`, STAFF);
      const main = page.locator("main");
      await expect(main.getByRole("heading", {name: STAFF_ADMIN.name})).toBeVisible();
      await expect(main.getByRole("button", {name: /actions\.edit/})).toHaveCount(0);
    },
  );

  test(
    "ADMIN gives STAFF the facility admin role in the details form; STAFF gets the admin menu",
    {tag: "@ui"},
    async ({page, api, browser}) => {
      const {facilityId, staffUserId} = artifact();
      const adminMenuItem = "routes.facility.facility_admin.reports";
      const staffContext = await browser.newContext();
      try {
        const staffPage = await staffContext.newPage();
        await openPage(staffPage, `/${FACILITY.url}/calendar`, STAFF);
        const staffMenu = staffPage.getByRole("navigation");
        await expect(staffMenu.getByText("routes.facility.clients", {exact: true})).toBeVisible();
        await expect(staffMenu.getByText(adminMenuItem, {exact: true})).toHaveCount(0);

        await openPage(page, `/${FACILITY.url}/staff/${staffUserId}`, ADMIN);
        const form = page.locator("form#staff_edit");
        await form.getByRole("button", {name: "actions.edit"}).click();
        // The seeded users are managed globally: their own data is not editable here.
        await expect(form.getByText("facility_user.not_managed_by_current_facility")).toBeVisible();
        await expect(formField(form, "name")).toHaveCount(0);
        const adminRole = formField(form, "staff.hasFacilityAdmin");
        await expect(adminRole).not.toBeChecked();
        await adminRole.check();
        await submitButton(page, "staff_edit").click();
        await expectFormSuccess(page, "staff_edit");
        // Back in the view mode.
        await expect(adminRole).toHaveCount(0);

        const adminApi = await api.loggedInAs(ADMIN);
        const body = await adminApi.list<{staff: {hasFacilityAdmin: boolean; deactivatedAt: string | null}}>(
          `facility/${facilityId}/user/staff`,
          staffUserId,
        );
        expect(body[0]!.staff).toMatchObject({hasFacilityAdmin: true, deactivatedAt: null});

        await staffPage.reload();
        await disableTranslations(staffPage);
        await expect(staffMenu.getByText(adminMenuItem, {exact: true})).toBeVisible();
      } finally {
        await staffContext.close();
      }
    },
  );

  readOnlyTest(
    "the staff list has the staff members only, each linking to the details",
    {tag: "@ui"},
    async ({page}) => {
      const {staffUserId} = artifact();
      await openPage(page, `/${FACILITY.url}/staff`, STAFF);
      const main = page.locator("main");
      await expect(tableRows(main, STAFF.name)).toHaveCount(1);
      await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(1);
      await expect(tableRows(main, STAFF.email)).toHaveCount(1);
      // The admin who is not staff, and the member with no role, are not on the list.
      await expect(main.getByText(ADMIN.name)).toHaveCount(0);
      await expect(main.getByText(BARE_MEMBER.name)).toHaveCount(0);
      // Showing the inactive ones is for the admins.
      await expect(main.getByText("facility_user.staff.list_show_inactive")).toHaveCount(0);

      await tableRows(main, STAFF.name).getByRole("link", {name: STAFF.name}).click();
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/staff/${staffUserId}$`));
      await expect(main.getByRole("heading", {name: STAFF.name})).toBeVisible();
    },
  );

  readOnlyTest(
    "the staff table has the columns of the account for an admin only, and a value in each column",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const ADMIN_ONLY = [
        "hasEmailVerified",
        "passwordExpireAt",
        "lastPasswordChangeAt",
        "isOtpRequired",
        "otpRequiredAt",
        "hasOtpConfigured",
        "isManagedByThisFacility",
        "managedByFacility.name",
        "lastLoginFailureAt",
        "staff.isActive",
        "staff.deactivatedAt",
      ];
      const HIDDEN_AT_FIRST = [
        "hasGlobalAdmin",
        "firstMeetingDate",
        "lastMeetingDate",
        "completedMeetingsCount",
        "plannedMeetingsCount",
        "staff.createdAt",
        "staff.createdBy.name",
      ];
      const SHOWN_AT_FIRST = [
        "name",
        "email",
        "hasPassword",
        "staff.hasFacilityAdmin",
        "completedMeetingsCountLastMonth",
        "plannedMeetingsCountNextMonth",
      ];
      const main = page.locator("main");

      // The staff member first: the columns shown are kept in the browser.
      await test.step("a staff member who is not an admin", async () => {
        await openPage(page, `/${FACILITY.url}/staff`, STAFF);
        for (const column of SHOWN_AT_FIRST) {
          await expect(columnHeader(main, column), column).toBeVisible();
        }
        await main.getByRole("button", {name: "tables.choose_columns"}).click();
        for (const column of HIDDEN_AT_FIRST) {
          await expect(columnChooserBox(page, "staff", column), column).not.toBeChecked();
        }
        for (const column of ADMIN_ONLY) {
          await expect(columnChooserBox(page, "staff", column), column).toHaveCount(0);
        }
      });

      await test.step("an admin", async () => {
        await page.goto("about:blank");
        await page.context().clearCookies();
        await openPage(page, `/${FACILITY.url}/staff`, ADMIN);
        await showTableColumns(page, main, "staff", [...ADMIN_ONLY, ...HIDDEN_AT_FIRST]);
        const columns = [...SHOWN_AT_FIRST, ...ADMIN_ONLY, ...HIDDEN_AT_FIRST];
        const cells = {
          "name": STAFF_ADMIN.name,
          "email": STAFF_ADMIN.email,
          "hasPassword": "bool_values.yes",
          "staff.hasFacilityAdmin": "bool_values.yes",
          "completedMeetingsCountLastMonth": "0",
          "plannedMeetingsCountNextMonth": "0",
          "hasEmailVerified": "bool_values.yes",
          "passwordExpireAt": "—",
          "lastPasswordChangeAt": "—",
          "isOtpRequired": "bool_values.no",
          "otpRequiredAt": "—",
          "hasOtpConfigured": "bool_values.no",
          "isManagedByThisFacility": "bool_values.no",
          "managedByFacility.name": "—",
          "lastLoginFailureAt": "—",
          "staff.isActive": "bool_values.yes",
          "staff.deactivatedAt": "—",
          "hasGlobalAdmin": "bool_values.no",
          "firstMeetingDate": "—",
          "lastMeetingDate": "—",
          "completedMeetingsCount": "0",
          "plannedMeetingsCount": "0",
          "staff.createdAt": expect.stringMatching(SHOWN_TABLE_TIME),
          "staff.createdBy.name": await userName(globalAdminApi),
        };
        await expect.poll(() => tableCellTexts(tableRows(main, STAFF_ADMIN.name), columns)).toEqual(cells);
        await expect
          .poll(() => tableCellTexts(tableRows(main, STAFF.name), columns))
          .toEqual({...cells, "name": STAFF.name, "email": STAFF.email, "staff.hasFacilityAdmin": "bool_values.no"});
      });
    },
  );

  test(
    "a deactivated staff member is on the staff list only with the inactive ones shown",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      await adminApi.patch(`facility/${facilityId}/user/staff/${staffUserId}`, {
        staff: {deactivatedAt: "2020-01-01T00:00:00Z"},
      });

      await openPage(page, `/${FACILITY.url}/staff`, ADMIN);
      const main = page.locator("main");
      await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(1);
      await expect(tableRows(main, STAFF.name)).toHaveCount(0);
      await main.getByLabel("facility_user.staff.list_show_inactive").check();
      await expect(tableRows(main, STAFF.name)).toHaveCount(1);
      await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(1);
      await test.step("the columns of the activity", async () => {
        const columns = ["staff.isActive", "staff.deactivatedAt"];
        await showTableColumns(page, main, "staff", columns);
        await expect
          .poll(() => tableCellTexts(tableRows(main, STAFF.name), columns))
          .toEqual({
            "staff.isActive": "bool_values.no",
            "staff.deactivatedAt": expect.stringMatching(SHOWN_TABLE_TIME),
          });
        await expect
          .poll(() => tableCellTexts(tableRows(main, STAFF_ADMIN.name), columns))
          .toEqual({"staff.isActive": "bool_values.yes", "staff.deactivatedAt": "—"});
      });
      await main.getByLabel("facility_user.staff.list_show_inactive").uncheck();
      await expect(tableRows(main, STAFF.name)).toHaveCount(0);
    },
  );

  test(
    "a deactivated staff member is shown as inactive, and is activated again in the form",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const staffPath = `facility/${facilityId}/user/staff`;
      await adminApi.patch(`${staffPath}/${staffUserId}`, {staff: {deactivatedAt: "2020-01-01T07:00:00Z"}});
      await openPage(page, `/${FACILITY.url}/staff/${staffUserId}`, ADMIN);
      const form = page.locator("form#staff_edit");
      const inactive = form.getByText("facility_user.staff.is_inactive.label");
      await expect(inactive).toBeVisible();
      // With the time of deactivation, in the browser's time zone.
      const since = "2020-01-01T07:00:00Z";
      await expect(form).toContainText(`facility_user.staff.is_inactive.since{date:${shownDateTime(since)}}`);

      await form.getByRole("button", {name: "actions.edit"}).click();
      const isActive = formField(form, "staff.isActive");
      await expect(isActive).not.toBeChecked();
      await expect(formField(form, "staff.deactivatedAt")).toHaveValue(
        DateTime.fromISO(since).toFormat("yyyy-MM-dd'T'HH:mm"),
      );
      await isActive.check();
      await expectSectionShown(formField(form, "staff.deactivatedAt"), false);
      await submitButton(page, "staff_edit").click();
      await expectFormSuccess(page, "staff_edit");
      await expect(inactive).toHaveCount(0);
      const [staff] = await adminApi.list<{staff: {deactivatedAt: string | null}}>(staffPath, staffUserId);
      expect(staff!.staff.deactivatedAt).toBeNull();
    },
  );

  test(
    "an admin edits the name, the password with its expiry and the roles of a staff member managed by the facility",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId} = artifact();
      const managed = {name: "Managed Staff", email: "managed-staff-ui@test.pl", password: "ManagedStaffPass1!"};
      const newPassword = "ChangedInTheForm2!";
      const userId = await createdId(
        await globalAdminApi.createUser({...managed, hasEmailVerified: true, managedByFacilityId: facilityId}),
      );
      await globalAdminApi.createMember({userId, facilityId, isFacilityStaff: true, isActiveFacilityStaff: true});
      const account = () => userAccount(globalAdminApi, userId);

      await openPage(page, `/${FACILITY.url}/staff/${userId}`, ADMIN);
      const form = page.locator("form#staff_edit");
      const editButton = form.getByRole("button", {name: "actions.edit"});
      const adminRole = formField(form, "staff.hasFacilityAdmin");

      await test.step("a new name and password, an expiry, a required OTP and the admin role", async () => {
        await editButton.click();
        await expect(form.getByText("facility_user.managed_by_current_facility", {exact: true})).toBeVisible();
        await expect(formField(form, "name")).toHaveValue(managed.name);
        await expect(formField(form, "email")).toHaveValue(managed.email);
        await expect(formField(form, "hasEmailVerified")).toBeChecked();
        await expect(formField(form, "hasPassword")).toBeChecked();
        // The password never expires unless given a time.
        await expect(formField(form, "passwordExpireAt")).toHaveValue("");
        await expect(form.getByText("forms.user.password_expire_never")).toBeVisible();
        await formField(form, "name").fill("Managed Staff, renamed");
        await formField(form, "password").click();
        await formField(form, "password").fill(newPassword);
        await formField(form, "passwordExpireAt_daysLeft").fill("10");
        await expect(formField(form, "passwordExpireAt")).not.toHaveValue("");
        await formField(form, "isOtpRequired").check();
        await adminRole.check();
        await submitButton(page, "staff_edit").click();
        await expectFormSuccess(page, "staff_edit");
        await expect(editButton).toBeVisible();
        await expect(page.locator("main").getByRole("heading", {name: "Managed Staff, renamed"})).toBeVisible();

        const saved = await account();
        expect(saved).toMatchObject({
          name: "Managed Staff, renamed",
          hasPassword: true,
          members: [{hasFacilityAdmin: true, isActiveFacilityStaff: true}],
        });
        expect(daysFromNow(saved.passwordExpireAt!)).toBeCloseTo(10, 1);
        expect(daysFromNow(saved.otpRequiredAt!)).toBeCloseTo(7, 1);
        expect((await MemoAPI.attemptLogin({email: managed.email, password: newPassword})).status).toBe(200);
        expect((await MemoAPI.attemptLogin(managed)).status).toBe(401);
      });

      await test.step("without a password the member cannot be a facility admin", async () => {
        await editButton.click();
        await expect(formField(form, "passwordExpireAt_daysLeft")).toHaveValue("10");
        await expect(adminRole).toBeChecked();
        await formField(form, "hasPassword").uncheck();
        await expect(adminRole).not.toBeChecked();
        await expect(adminRole).toBeDisabled();
        await submitButton(page, "staff_edit").click();
        await expect(editButton).toBeVisible();
        expect(await account()).toMatchObject({
          hasPassword: false,
          passwordExpireAt: null,
          otpRequiredAt: null,
          members: [{hasFacilityAdmin: false, isActiveFacilityStaff: true}],
        });
        expect((await MemoAPI.attemptLogin({email: managed.email, password: newPassword})).status).toBe(401);
      });
    },
  );

  test(
    "a table view is saved, loaded after a reload and deleted; it is kept in the user's storage",
    {tag: "@ui"},
    async ({page, api}) => {
      const staffApi = await api.loggedInAs(STAFF);
      // The views of a table go into one entry of the user's storage, in the app's own encoding.
      const storedViews = async () => {
        const key = (await storageKeys(staffApi)).find((k) => k.endsWith("table.saves.facilityStaff"));
        return key ? JSON.stringify(await storageValue(staffApi, key)) : "";
      };
      expect(await storedViews()).not.toContain("E2E Sarah only");

      await openPage(page, `/${FACILITY.url}/staff`, STAFF);
      const main = page.locator("main");
      const search = main.getByRole("textbox", {name: "actions.search"});
      const staffRow = tableRows(main, STAFF.name);
      const staffAdminRow = tableRows(main, STAFF_ADMIN.name);
      const viewsButton = main.locator("title=tables.saved_views.hint");
      const view = (name: string) => page.locator(`button[data-view-name="${name}"]`);
      const newViewName = page.getByPlaceholder("tables.saved_views.new_placeholder");
      // Loading a view closes the list only if the view changed something.
      async function openViews() {
        await page.keyboard.press("Escape");
        await expect(newViewName).toBeHidden();
        await viewsButton.click();
        await expect(newViewName).toBeVisible();
      }
      await expect(staffRow).toHaveCount(1);

      await test.step("save the view with a search", async () => {
        await search.fill("Sarah");
        await expect(staffRow).toHaveCount(0);
        await expect(staffAdminRow).toHaveCount(1);
        await openViews();
        await newViewName.fill("E2E Sarah only");
        await page.getByRole("button", {name: "actions.save", exact: true}).click();
        await expect(view("E2E Sarah only")).toBeVisible();
        await expect.poll(storedViews).toContain("E2E Sarah only");
      });

      await test.step("the default view clears the search", async () => {
        await view("tables.saved_views.default_view_name").click();
        await expect(search).toHaveValue("");
        await expect(staffRow).toHaveCount(1);
      });

      await test.step("after a reload the saved view brings the search back", async () => {
        await page.reload();
        await disableTranslations(page);
        await expect(staffRow).toHaveCount(1);
        await openViews();
        await view("E2E Sarah only").click();
        await expect(search).toHaveValue("Sarah");
        await expect(staffRow).toHaveCount(0);
        await expect(staffAdminRow).toHaveCount(1);
      });

      await test.step("delete the view, past a confirmation", async () => {
        await openViews();
        // The unnamed menu button of the view comes right after it.
        await view("E2E Sarah only").locator("xpath=following::button[1]").click();
        await page.getByRole("button", {name: "actions.delete", exact: true}).click();
        await expect(page.getByRole("heading", {name: /forms\.table_saved_view_delete\.form_name/i})).toBeVisible();
        await page.getByRole("button", {name: "actions.confirm", exact: true}).click();
        await expect(view("E2E Sarah only")).toHaveCount(0);
        await expect.poll(storedViews).not.toContain("E2E Sarah only");
      });
    },
  );
});
