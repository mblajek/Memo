import type {Page} from "@playwright/test";
import {loadConfig} from "../lib/config.ts";
import {BARE_MEMBER, FACILITY, STAFF, facilityLayer} from "../lib/layers/facility.ts";
import {createdId} from "../lib/responses.ts";
import {expectFormSuccess, formField, formSelect, submitButton, tableRows} from "../helpers/selectors.ts";
import {expect, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * The global admin's user edit modal of the users list, with the table of the user's facility
 * memberships. The form saves the user first, then creates, updates and deletes the memberships.
 */

const ROLES = ["hasFacilityAdmin", "isFacilityStaff", "isActiveFacilityStaff", "isFacilityClient"] as const;
type Role = (typeof ROLES)[number];
type Member = {readonly facilityId: string} & {readonly [R in Role]: boolean};

interface AdminUser {
  readonly name: string;
  readonly hasGlobalAdmin: boolean;
  readonly members: readonly Member[];
}

async function adminUser(adminApi: MemoAPI, userId: string): Promise<AdminUser> {
  const user = (await adminApi.list<AdminUser>(`admin/user`, userId))[0]!;
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

facilityLayer.describe((artifact) => {
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
