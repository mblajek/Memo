import type {Page} from "@playwright/test";
import {DateTime} from "luxon";
import {loadConfig} from "../lib/config.ts";
import {ADMIN, BARE_MEMBER, FACILITY, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {createdId} from "../lib/responses.ts";
import {EXPORTED_TIME, SHOWN_TABLE_TIME, daysFromNow} from "../helpers/dates.ts";
import {userAccount, userName, type UserAccountMember} from "../helpers/queries.ts";
import {exportTable, exportedRecords, stubSaveFilePicker} from "../helpers/saved_file.ts";
import {
  allTableRows,
  chooseInFormSelect,
  columnHeader,
  expectFormSuccess,
  expectSectionShown,
  formField,
  formSelect,
  showTableColumns,
  submitButton,
  tableCellTexts,
  tableRows,
  tableCell,
} from "../helpers/selectors.ts";
import {expect, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * The global admin's user edit modal of the users list, with the table of the user's facility
 * memberships. The form saves the user first, then creates, updates and deletes the memberships.
 */

const ROLES = ["hasFacilityAdmin", "isFacilityStaff", "isActiveFacilityStaff", "isFacilityClient"] as const;
type Role = (typeof ROLES)[number];
type Member = UserAccountMember;

async function adminUser(adminApi: MemoAPI, userId: string) {
  const user = await userAccount(adminApi, userId);
  return {
    name: user.name,
    hasGlobalAdmin: user.hasGlobalAdmin,
    members: user.members
      .map((m) => ({
        facilityId: m.facilityId,
        hasFacilityAdmin: m.hasFacilityAdmin,
        isFacilityStaff: m.isFacilityStaff,
        isActiveFacilityStaff: m.isActiveFacilityStaff,
        isFacilityClient: m.isFacilityClient,
      }))
      .toSorted((a, b) => a.facilityId.localeCompare(b.facilityId)),
  };
}

/** The moment as the API takes it: in UTC, to the second. */
function isoTime(time: DateTime) {
  return time.toUTC().set({millisecond: 0}).toISO({suppressMilliseconds: true});
}

/** The value of a `datetime-local` input for the moment. */
function localInput(time: DateTime) {
  return time.toFormat("yyyy-MM-dd'T'HH:mm");
}

function member(facilityId: string, ...roles: readonly Role[]): Member {
  return {
    facilityId,
    hasFacilityAdmin: roles.includes("hasFacilityAdmin"),
    isFacilityStaff: roles.includes("isFacilityStaff"),
    isActiveFacilityStaff: roles.includes("isActiveFacilityStaff"),
    isFacilityClient: roles.includes("isFacilityClient"),
  };
}

/** Opens the edit modal of the user with the given email, as the global admin. */
async function openUserEdit(page: Page, email: string) {
  await openPage(page, "/admin/users", (await loadConfig()).ui.admin);
  // The users list is paged; the search brings the user to the first page.
  await page.getByPlaceholder("actions.search").fill(email);
  const row = tableRows(page, email);
  await expect(row).toHaveCount(1);
  await row.getByRole("button", {name: "actions.edit"}).click();
  await expect(page.getByRole("heading", {name: /forms\.user_edit\.form_name/i})).toBeVisible();
  return page.locator("form#user_edit");
}

/** The field of the select in the last row of the memberships table, adding a membership. */
const ADDED_FACILITY = "__addedFacility";

const roleBox = (form: ReturnType<Page["locator"]>, row: number, role: Role) =>
  form.locator(`input[name="members.${row}.${role}"]`);

async function submit(page: Page) {
  await submitButton(page, "user_edit").click();
  await expectFormSuccess(page, "user_edit");
}

/** The columns of the users table that are hidden until chosen, but for the times of the logins. */
const HIDDEN_USER_COLUMNS = [
  "hasEmailVerified",
  "passwordExpireAt",
  "lastPasswordChangeAt",
  "isOtpRequired",
  "otpRequiredAt",
  "hasOtpConfigured",
  "facilities.*.name",
  "facilities.count",
  "managedByFacility.name",
  "hasFacilityAdmin",
  "isStaff",
  "isClient",
  "createdAt",
  "createdBy.id",
];
const USER_COLUMNS = ["name", "email", "hasPassword", "hasGlobalAdmin", ...HIDDEN_USER_COLUMNS];

/** Opens the users table as the global admin, with all of `USER_COLUMNS` shown. */
async function openUsersTable(page: Page) {
  await openPage(page, "/admin/users", (await loadConfig()).ui.admin);
  const main = page.locator("main");
  await showTableColumns(page, main, "user", HIDDEN_USER_COLUMNS);
  return main;
}

facilityLayer.describe((artifact) => {
  readOnlyTest(
    "the users table shows the account, the roles and the facilities of each user",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {admin} = (await loadConfig()).ui;
      const main = await openUsersTable(page);
      // The list is paged: each user is brought to the first page by the search.
      const cells = async (email: string) => {
        await page.getByPlaceholder("actions.search").fill(email);
        await expect(allTableRows(main)).toHaveCount(1);
        await expect(tableRows(main, email)).toHaveCount(1);
        return await tableCellTexts(tableRows(main, email), USER_COLUMNS);
      };
      const staffCells = {
        "name": STAFF.name,
        "email": STAFF.email,
        "hasPassword": "bool_values.yes",
        "hasGlobalAdmin": "bool_values.no",
        "hasEmailVerified": "bool_values.yes",
        "passwordExpireAt": "—",
        "lastPasswordChangeAt": "—",
        "isOtpRequired": "bool_values.no",
        "otpRequiredAt": "—",
        "hasOtpConfigured": "bool_values.no",
        "facilities.*.name": FACILITY.name,
        "facilities.count": "1",
        "managedByFacility.name": "—",
        "hasFacilityAdmin": "bool_values.no",
        "isStaff": "bool_values.yes",
        "isClient": "bool_values.no",
        "createdAt": expect.stringMatching(SHOWN_TABLE_TIME),
        "createdBy.id": await userName(globalAdminApi),
      };
      expect(await cells(STAFF.email)).toEqual(staffCells);
      expect(await cells(ADMIN.email)).toEqual({
        ...staffCells,
        name: ADMIN.name,
        email: ADMIN.email,
        hasFacilityAdmin: "bool_values.yes",
        isStaff: "bool_values.no",
      });
      expect(await cells(STAFF_ADMIN.email)).toEqual({
        ...staffCells,
        name: STAFF_ADMIN.name,
        email: STAFF_ADMIN.email,
        hasFacilityAdmin: "bool_values.yes",
      });
      expect(await cells(BARE_MEMBER.email)).toEqual({
        ...staffCells,
        name: BARE_MEMBER.name,
        email: BARE_MEMBER.email,
        isStaff: "bool_values.no",
      });
      // The admin's own facilities and creator depend on the DB the tests run on.
      expect(await cells(admin.email)).toMatchObject({
        email: admin.email,
        hasPassword: "bool_values.yes",
        hasGlobalAdmin: "bool_values.yes",
        hasEmailVerified: "bool_values.yes",
      });

      await test.step("the columns can be sorted by, but for the list of the facilities", async () => {
        const seeded = [STAFF, ADMIN, STAFF_ADMIN, BARE_MEMBER];
        const seededEmails: readonly string[] = seeded.map(({email}) => email);
        await page.getByPlaceholder("actions.search").fill("@test.pl");
        await expect(tableRows(main, STAFF.email)).toHaveCount(1);
        const sortButton = (column: string) =>
          columnHeader(main, column).getByRole("button", {name: `tables.tables.user.column_names.${column}`});
        await expect(sortButton("facilities.*.name")).toHaveCount(0);
        const emails = async () =>
          (await tableCell(allTableRows(main), "email").allInnerTexts())
            .map((email) => email.trim())
            .filter((email) => seededEmails.includes(email));
        const byName = seeded.toSorted((a, b) => a.name.localeCompare(b.name)).map(({email}) => email);
        // The table starts sorted by the name.
        await expect.poll(emails).toEqual(byName);
        await sortButton("name").click();
        await expect.poll(emails).toEqual(byName.toReversed());
      });
    },
  );

  readOnlyTest(
    "the export of the users table has the values of each kind as texts",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      await stubSaveFilePicker(page);
      const main = await openUsersTable(page);
      await page.getByPlaceholder("actions.search").fill(STAFF_ADMIN.email);
      await expect(allTableRows(main)).toHaveCount(1);
      const column = (name: string) => `Tables.tables.user.column_names.${name}`;
      const records = exportedRecords(await exportTable(page, main));
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        [column("name")]: STAFF_ADMIN.name,
        [column("email")]: STAFF_ADMIN.email,
        [column("hasPassword")]: "bool_values.yes",
        [column("hasGlobalAdmin")]: "bool_values.no",
        [column("passwordExpireAt")]: "",
        [column("facilities.*.name")]: FACILITY.name,
        [column("facilities.count")]: "1",
        [column("managedByFacility.name")]: "",
        [column("createdAt")]: expect.stringMatching(EXPORTED_TIME),
      });
      // The user who created the account is exported by the name, as the table shows them.
      expect(records[0]![column("createdBy.id")]).toBe(await userName(globalAdminApi));
    },
  );

  test(
    "the global admin renames a user and changes the roles of their membership",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId, bareMemberUserId} = artifact();
      const form = await openUserEdit(page, BARE_MEMBER.email);
      await expect(formField(form, "name")).toHaveValue(BARE_MEMBER.name);
      await expect(tableRows(form, FACILITY.name)).toHaveCount(1);
      for (const role of ROLES) {
        await expect(roleBox(form, 0, role)).not.toBeChecked();
      }

      await test.step("the staff and the active staff boxes follow each other", async () => {
        await roleBox(form, 0, "isActiveFacilityStaff").check();
        await expect(roleBox(form, 0, "isFacilityStaff")).toBeChecked();
        await roleBox(form, 0, "isFacilityStaff").uncheck();
        await expect(roleBox(form, 0, "isActiveFacilityStaff")).not.toBeChecked();
        await roleBox(form, 0, "isFacilityStaff").check();
        await expect(roleBox(form, 0, "isActiveFacilityStaff")).toBeChecked();
        // A staff member can be made inactive.
        await roleBox(form, 0, "isActiveFacilityStaff").uncheck();
        await expect(roleBox(form, 0, "isFacilityStaff")).toBeChecked();
      });
      await roleBox(form, 0, "hasFacilityAdmin").check();
      await formField(form, "name").fill("Mark the Promoted");
      await submit(page);

      expect(await adminUser(globalAdminApi, bareMemberUserId)).toEqual({
        name: "Mark the Promoted",
        hasGlobalAdmin: false,
        members: [member(facilityId, "hasFacilityAdmin", "isFacilityStaff")],
      });
    },
  );

  test(
    "the global admin adds a membership in another facility, with roles",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId, bareMemberUserId} = artifact();
      const extra = {name: "Extra Facility", url: "int-test-extra"};
      const extraFacilityId = await createdId(await globalAdminApi.createFacility(extra));

      const form = await openUserEdit(page, BARE_MEMBER.email);
      // The last row offers the facilities the user is not a member of yet.
      await formSelect(form, ADDED_FACILITY).click();
      await expect(page.getByRole("option", {name: FACILITY.name, exact: true})).toHaveCount(0);
      await page.getByRole("option", {name: extra.name, exact: true}).click();
      await expect(tableRows(form, extra.name)).toHaveCount(1);
      await roleBox(form, 1, "hasFacilityAdmin").check();
      await roleBox(form, 1, "isFacilityStaff").check();
      await submit(page);

      expect(await adminUser(globalAdminApi, bareMemberUserId)).toEqual({
        name: BARE_MEMBER.name,
        hasGlobalAdmin: false,
        members: [
          member(facilityId),
          member(extraFacilityId, "hasFacilityAdmin", "isFacilityStaff", "isActiveFacilityStaff"),
        ].toSorted((a, b) => a.facilityId.localeCompare(b.facilityId)),
      });
    },
  );

  test("the global admin removes a staff membership, past a warning", {tag: "@ui"}, async ({page, globalAdminApi}) => {
    const {staffUserId} = artifact();
    const form = await openUserEdit(page, STAFF.email);
    const warning = form.getByText("forms.user.members_destructive_update_warning");
    await expect(roleBox(form, 0, "isFacilityStaff")).toBeChecked();
    await expect(warning).toBeHidden();
    await tableRows(form, FACILITY.name).getByRole("button", {name: "actions.delete"}).click();
    await expect(tableRows(form, FACILITY.name)).toHaveCount(0);
    await expect(warning).toBeVisible();
    // With a facility to add again, the row for adding is back.
    await expect(formSelect(form, ADDED_FACILITY)).toBeVisible();
    await submit(page);

    expect(await adminUser(globalAdminApi, staffUserId)).toEqual({
      name: STAFF.name,
      hasGlobalAdmin: false,
      members: [],
    });
  });

  test(
    "the global admin creates a user with every field of the form; the user logs in",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {facilityId} = artifact();
      const user = {name: "Fully Specified User", email: "fully-specified@test.pl", password: "FullySpecified1!"};
      await openPage(page, "/admin/users", (await loadConfig()).ui.admin);
      await page.getByRole("button", {name: /actions\.user\.add/}).click();
      const form = page.locator("form#user_create");
      await formField(form, "name").fill(user.name);
      // Nothing that needs an email, and then a password, can be set before them.
      await expect(formField(form, "hasEmailVerified")).toBeDisabled();
      await expect(formField(form, "hasPassword")).toBeDisabled();
      await expect(formField(form, "hasGlobalAdmin")).toBeDisabled();
      await formField(form, "email").fill(user.email);
      await formField(form, "hasEmailVerified").check();
      await formField(form, "hasPassword").check();
      await expect(formField(form, "hasGlobalAdmin")).toBeEnabled();
      // The field is read-only until clicked, to keep the browser from filling it in.
      await formField(form, "password").click();
      await formField(form, "password").fill(user.password);

      await test.step("the password expires in a week by default; the days and the date follow each other", async () => {
        const daysLeft = formField(form, "passwordExpireAt_daysLeft");
        await expect(daysLeft).toHaveValue("7");
        await daysLeft.fill("30");
        await expect
          .poll(async () => daysFromNow(await formField(form, "passwordExpireAt").inputValue()))
          .toBeCloseTo(30, 1);
        await formField(form, "passwordExpireAt").fill(localInput(DateTime.now().plus({days: 12, hours: 1})));
        await expect(daysLeft).toHaveValue("12");
      });

      await test.step("a required OTP gets a week for configuring it", async () => {
        await expectSectionShown(formField(form, "otpRequiredAt"), false);
        await formField(form, "isOtpRequired").check();
        await expectSectionShown(formField(form, "otpRequiredAt"), true);
        await expect(formField(form, "otpRequiredAt_daysLeft")).toHaveValue("7");
        const otpInfo = form.getByText("forms.user.otp_configured_info.when_not_configured");
        await expect(otpInfo).toBeVisible();
        await expectSectionShown(otpInfo, true);
      });

      await formSelect(form, ADDED_FACILITY).click();
      await page.getByRole("option", {name: FACILITY.name, exact: true}).click();
      await roleBox(form, 0, "isFacilityStaff").check();
      await chooseInFormSelect(page, "managedByFacilityId", FACILITY.name);
      await formField(form, "hasGlobalAdmin").check();
      await submitButton(page, "user_create").click();
      await expectFormSuccess(page, "user_create");

      const {rows} = await globalAdminApi.tquery<{id: string}>("admin/user/tquery", {
        columns: ["id"],
        filter: {type: "column", column: "email", op: "=", val: user.email},
      });
      expect(rows).toHaveLength(1);
      const created = await userAccount(globalAdminApi, rows[0]!.id);
      expect(created).toMatchObject({
        name: user.name,
        email: user.email,
        hasEmailVerified: true,
        hasPassword: true,
        hasOtpConfigured: false,
        hasGlobalAdmin: true,
        managedByFacilityId: facilityId,
        members: [expect.objectContaining({...member(facilityId, "isFacilityStaff", "isActiveFacilityStaff")})],
      });
      expect(daysFromNow(created.passwordExpireAt!)).toBeCloseTo(12, 0);
      expect(daysFromNow(created.otpRequiredAt!)).toBeCloseTo(7, 1);
      expect((await MemoAPI.attemptLogin(user)).status).toBe(200);
    },
  );

  test(
    "the global admin takes the password expiry, the OTP requirement, the password and the email from a user",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const user = {name: "Stripped User", email: "stripped-user@test.pl", password: "StrippedUser1!"};
      const userId = await createdId(
        await globalAdminApi.createUser({
          ...user,
          hasEmailVerified: true,
          passwordExpireAt: isoTime(DateTime.now().plus({days: 20, hours: 1})),
          otpRequiredAt: isoTime(DateTime.now().plus({days: 5, hours: 1})),
        }),
      );
      const reopen = async () => {
        await page.getByPlaceholder("actions.search").fill(user.name);
        await tableRows(page, user.name).getByRole("button", {name: "actions.edit"}).click();
        await expect(page.getByRole("heading", {name: /forms\.user_edit\.form_name/i})).toBeVisible();
      };
      const form = await openUserEdit(page, user.email);
      // The toast of the previous save may still be there: the closed form tells that this one is
      // done.
      const save = async () => {
        await submitButton(page, "user_edit").click();
        await expect(form).toBeHidden();
      };

      await test.step("the expiry and the OTP requirement", async () => {
        await expect(formField(form, "hasEmailVerified")).toBeChecked();
        await expect(formField(form, "hasPassword")).toBeChecked();
        await expect(formField(form, "password")).toHaveValue("");
        await expect(formField(form, "passwordExpireAt_daysLeft")).toHaveValue("20");
        await expect(formField(form, "isOtpRequired")).toBeChecked();
        await expect(formField(form, "otpRequiredAt_daysLeft")).toHaveValue("5");
        await form.getByRole("button", {name: "forms.user.clear_password_expire_at"}).click();
        await expect(formField(form, "passwordExpireAt")).toHaveValue("");
        await expect(form.getByText("forms.user.password_expire_never")).toBeVisible();
        await formField(form, "isOtpRequired").uncheck();
        await save();
        expect(await userAccount(globalAdminApi, userId)).toMatchObject({
          hasPassword: true,
          passwordExpireAt: null,
          otpRequiredAt: null,
        });
        // The password field left empty leaves the password as it was.
        expect((await MemoAPI.attemptLogin(user)).status).toBe(200);
      });

      await test.step("a changed email is not verified any more", async () => {
        await reopen();
        await formField(form, "email").fill("stripped-user-new@test.pl");
        await expect(formField(form, "hasEmailVerified")).not.toBeChecked();
        await expect(form.locator("title=forms.user_edit.email_not_verified_info")).toBeVisible();
        await save();
        expect(await userAccount(globalAdminApi, userId)).toMatchObject({
          email: "stripped-user-new@test.pl",
          hasEmailVerified: false,
          hasPassword: true,
        });
      });

      await test.step("the password is taken away", async () => {
        await reopen();
        await formField(form, "hasPassword").uncheck();
        await expectSectionShown(formField(form, "password"), false);
        await save();
        expect(await userAccount(globalAdminApi, userId)).toMatchObject({
          email: "stripped-user-new@test.pl",
          hasPassword: false,
        });
        expect((await MemoAPI.attemptLogin({...user, email: "stripped-user-new@test.pl"})).status).toBe(401);
      });

      await test.step("without the email there is nothing to verify, and no password to give", async () => {
        await reopen();
        await formField(form, "email").fill("");
        await expect(formField(form, "hasEmailVerified")).toBeDisabled();
        await expect(formField(form, "hasPassword")).toBeDisabled();
        await save();
        expect(await userAccount(globalAdminApi, userId)).toMatchObject({
          name: user.name,
          email: null,
          hasEmailVerified: false,
          hasPassword: false,
        });
      });
    },
  );

  readOnlyTest(
    "the global admin cannot take the global admin role from themselves",
    {tag: "@ui"},
    async ({page, api}) => {
      const {admin} = (await loadConfig()).ui;
      const form = await openUserEdit(page, admin.email);
      const globalAdmin = formField(form, "hasGlobalAdmin");
      await expect(globalAdmin).toBeChecked();
      await globalAdmin.uncheck();
      await submitButton(page, "user_edit").click();
      await expect(form.getByText("forms.user_edit.validation.cannot_remove_own_global_admin")).toBeVisible();
      await expect(page.getByText("forms.user_edit.success")).toHaveCount(0);

      // Still the global admin: the call below needs the role.
      const adminApi = await api.loggedInAs(admin);
      const {rows} = await adminApi.tquery("admin/user/tquery", {
        columns: ["hasGlobalAdmin"],
        filter: {type: "column", column: "email", op: "=", val: admin.email},
      });
      expect(rows).toEqual([{hasGlobalAdmin: true}]);
    },
  );
});
