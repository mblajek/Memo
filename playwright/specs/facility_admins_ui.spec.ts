import type {Page} from "@playwright/test";
import {ADMIN, BARE_MEMBER, FACILITY, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {createdId} from "../lib/responses.ts";
import {SHOWN_TABLE_TIME} from "../helpers/dates.ts";
import {userName, userAccount} from "../helpers/queries.ts";
import {
  columnChooserBox,
  columnHeader,
  expectFormErrors,
  expectFormSuccess,
  expectSectionShown,
  formField,
  showTableColumns,
  submitButton,
  tableCellTexts,
  tableRows,
} from "../helpers/selectors.ts";
import {expect, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * The facility admins page and its edit modal. The user's own data is editable there only for
 * users managed by the facility; the seeded users are managed globally.
 */

async function openAdmins(page: Page) {
  await openPage(page, `/${FACILITY.url}/admins`, ADMIN);
  return page.locator("main");
}

/** Opens the edit modal of the admin of the given name. */
async function openAdminEdit(page: Page, name: string) {
  const main = await openAdmins(page);
  await tableRows(main, name).getByRole("button", {name: "actions.edit"}).click();
  await expect(page.getByRole("heading", {name: /forms\.facility_admin_edit\.form_name/i})).toBeVisible();
  return page.locator("form#facility_admin_edit");
}

facilityLayer.describe((artifact) => {
  readOnlyTest("the admins page lists the facility admins only", {tag: "@ui"}, async ({page}) => {
    const main = await openAdmins(page);
    await expect(tableRows(main, ADMIN.name)).toHaveCount(1);
    await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(1);
    await expect(tableRows(main, ADMIN.email)).toHaveCount(1);
    await expect(main.getByText(STAFF.name)).toHaveCount(0);
    await expect(main.getByText(BARE_MEMBER.name)).toHaveCount(0);
  });

  readOnlyTest(
    "the admins table is read-only for a staff member, and has a value in each column for an admin",
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
      ];
      const HIDDEN_AT_FIRST = ["member.isActiveStaff", "createdAt", "createdBy.name"];
      const SHOWN_AT_FIRST = ["name", "email", "member.isStaff", "hasGlobalAdmin"];
      const main = page.locator("main");

      // The staff member first: the columns shown are kept in the browser.
      await test.step("a staff member who is not an admin", async () => {
        await openPage(page, `/${FACILITY.url}/admins`, STAFF);
        await expect(tableRows(main, ADMIN.name)).toHaveCount(1);
        await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(1);
        for (const column of SHOWN_AT_FIRST) {
          await expect(columnHeader(main, column), column).toBeVisible();
        }
        await expect(columnHeader(main, "actions")).toHaveCount(0);
        await expect(main.getByRole("button", {name: "actions.edit"})).toHaveCount(0);
        await main.getByRole("button", {name: "tables.choose_columns"}).click();
        for (const column of HIDDEN_AT_FIRST) {
          await expect(columnChooserBox(page, "facility_admin", column), column).not.toBeChecked();
        }
        for (const column of ADMIN_ONLY) {
          await expect(columnChooserBox(page, "facility_admin", column), column).toHaveCount(0);
        }
      });

      await test.step("an admin", async () => {
        await page.goto("about:blank");
        await page.context().clearCookies();
        await openAdmins(page);
        await showTableColumns(page, main, "facility_admin", [...ADMIN_ONLY, ...HIDDEN_AT_FIRST]);
        const columns = [...SHOWN_AT_FIRST, ...ADMIN_ONLY, ...HIDDEN_AT_FIRST];
        const cells = {
          "name": ADMIN.name,
          "email": ADMIN.email,
          "member.isStaff": "bool_values.no",
          "hasGlobalAdmin": "bool_values.no",
          "hasEmailVerified": "bool_values.yes",
          "passwordExpireAt": "—",
          "lastPasswordChangeAt": "—",
          "isOtpRequired": "bool_values.no",
          "otpRequiredAt": "—",
          "hasOtpConfigured": "bool_values.no",
          "isManagedByThisFacility": "bool_values.no",
          "managedByFacility.name": "—",
          "lastLoginFailureAt": "—",
          "member.isActiveStaff": "bool_values.no",
          "createdAt": expect.stringMatching(SHOWN_TABLE_TIME),
          "createdBy.name": await userName(globalAdminApi),
        };
        await expect.poll(() => tableCellTexts(tableRows(main, ADMIN.name), columns)).toEqual(cells);
        await expect
          .poll(() => tableCellTexts(tableRows(main, STAFF_ADMIN.name), columns))
          .toEqual({
            ...cells,
            "name": STAFF_ADMIN.name,
            "email": STAFF_ADMIN.email,
            "member.isStaff": "bool_values.yes",
            "member.isActiveStaff": "bool_values.yes",
          });
        await expect(tableRows(main, ADMIN.name).getByRole("button", {name: "actions.edit"})).toBeVisible();
      });
    },
  );

  readOnlyTest(
    "a globally managed admin has only the admin role to edit; cancel changes nothing",
    {tag: "@ui"},
    async ({page, api}) => {
      const form = await openAdminEdit(page, STAFF_ADMIN.name);
      await expect(form.getByText("facility_user.not_managed_by_current_facility")).toBeVisible();
      await expect(formField(form, "name")).toHaveCount(0);
      await expect(formField(form, "email")).toHaveCount(0);
      const adminRole = formField(form, "member.hasFacilityAdmin");
      const warning = form.getByText("forms.facility_admin.facility_admin_deactivation_warning");
      await expect(adminRole).toBeChecked();
      await expectSectionShown(warning, false);
      await adminRole.uncheck();
      // She stays a staff member, so there is no warning about losing access.
      await expectSectionShown(warning, false);
      await page.getByRole("button", {name: "actions.cancel"}).click();
      await expect(form).toBeHidden();

      const staffAdminApi = await api.loggedInAs(STAFF_ADMIN);
      const {permissions} = await staffAdminApi.getData<{permissions: {facilityAdmin: boolean}}>(
        `user/status/${artifact().facilityId}`,
      );
      expect(permissions.facilityAdmin).toBe(true);
    },
  );

  readOnlyTest(
    "unticking the admin role of an admin who is not staff warns about losing access",
    {tag: "@ui"},
    async ({page}) => {
      const form = await openAdminEdit(page, ADMIN.name);
      const warning = form.getByText("forms.facility_admin.facility_admin_deactivation_warning");
      await expectSectionShown(warning, false);
      await formField(form, "member.hasFacilityAdmin").uncheck();
      await expectSectionShown(warning, true);
      await formField(form, "member.hasFacilityAdmin").check();
      await expectSectionShown(warning, false);
    },
  );

  test(
    "an admin takes the admin role from another admin in the modal",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId, adminUserId, staffAdminUserId} = artifact();
      const form = await openAdminEdit(page, STAFF_ADMIN.name);
      await formField(form, "member.hasFacilityAdmin").uncheck();
      await submitButton(page, "facility_admin_edit").click();
      await expectFormSuccess(page, "user_edit");
      const main = page.locator("main");
      await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(0);
      await expect(tableRows(main, ADMIN.name)).toHaveCount(1);

      const data = await globalAdminApi.list<{
        id: string;
        members: readonly {facilityId: string; hasFacilityAdmin: boolean; isFacilityStaff: boolean}[];
      }>("admin/user", [staffAdminUserId, adminUserId]);
      const roles = (userId: string) =>
        data
          .find((u) => u.id === userId)!
          .members.map(({facilityId, hasFacilityAdmin, isFacilityStaff}) => ({
            facilityId,
            hasFacilityAdmin,
            isFacilityStaff,
          }));
      expect(roles(staffAdminUserId)).toEqual([{facilityId, hasFacilityAdmin: false, isFacilityStaff: true}]);
      expect(roles(adminUserId)).toEqual([{facilityId, hasFacilityAdmin: true, isFacilityStaff: false}]);
    },
  );

  test(
    "an admin edits the name and the email of an admin managed by the facility",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId} = artifact();
      const managed = {name: "Managed Admin", email: "managed-admin-ui@test.pl"};
      const userId = await createdId(
        await globalAdminApi.createUser({
          ...managed,
          password: "ManagedAdminPass1!",
          hasEmailVerified: true,
          managedByFacilityId: facilityId,
        }),
      );
      await globalAdminApi.createMember({userId, facilityId, hasFacilityAdmin: true});

      const form = await openAdminEdit(page, managed.name);
      await expect(form.getByText("facility_user.managed_by_current_facility", {exact: true})).toBeVisible();
      await expect(formField(form, "name")).toHaveValue(managed.name);
      await expect(formField(form, "email")).toHaveValue(managed.email);
      await formField(form, "name").fill("Managed Admin, renamed");
      await formField(form, "email").fill("managed-admin-ui-new@test.pl");
      await submitButton(page, "facility_admin_edit").click();
      await expectFormSuccess(page, "user_edit");
      const main = page.locator("main");
      await expect(tableRows(main, "Managed Admin, renamed")).toContainText("managed-admin-ui-new@test.pl");
      await test.step("the table says who manages the admin, and that the new email is not verified", async () => {
        const columns = ["isManagedByThisFacility", "managedByFacility.name", "hasEmailVerified"];
        await showTableColumns(page, main, "facility_admin", columns);
        await expect
          .poll(() => tableCellTexts(tableRows(main, "Managed Admin, renamed"), columns))
          .toEqual({
            "isManagedByThisFacility": "bool_values.yes",
            "managedByFacility.name": FACILITY.name,
            "hasEmailVerified": "bool_values.no",
          });
      });

      const account = await userAccount(globalAdminApi, userId);
      expect(account).toMatchObject({
        name: "Managed Admin, renamed",
        email: "managed-admin-ui-new@test.pl",
        managedByFacilityId: facilityId,
      });
      expect(account.members).toHaveLength(1);
    },
  );

  test(
    "the name and the email of a managed admin are validated in the modal",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId} = artifact();
      const managed = {name: "Validated Admin", email: "validated-admin-ui@test.pl"};
      const userId = await createdId(
        await globalAdminApi.createUser({
          ...managed,
          password: "ManagedAdminPass1!",
          hasEmailVerified: true,
          managedByFacilityId: facilityId,
        }),
      );
      await globalAdminApi.createMember({userId, facilityId, hasFacilityAdmin: true});
      const form = await openAdminEdit(page, managed.name);
      const name = formField(form, "name");
      const email = formField(form, "email");

      await name.fill("");
      await submitButton(page, "facility_admin_edit").click();
      await expectFormErrors(form, {name: "required"});
      await name.fill(managed.name);
      await email.fill("not-an-email");
      await submitButton(page, "facility_admin_edit").click();
      await expectFormErrors(form, {email: "email"});
      // The email of another user, of any facility or none.
      await email.fill(STAFF.email);
      await submitButton(page, "facility_admin_edit").click();
      await expectFormErrors(form, {email: "unique"});

      await form.getByRole("button", {name: "actions.cancel"}).click();
      await expect(tableRows(page.locator("main"), managed.email)).toHaveCount(1);
    },
  );
});
