import {loadConfig} from "../lib/config.ts";
import {
  expectFormErrors,
  expectFormSuccess,
  expectSectionShown,
  formField,
  submitButton,
} from "../helpers/selectors.ts";
import {expect, openPage, readOnlyTest, test} from "../lib/test.ts";

/** The global admin's lists of facilities and users, and the forms adding to them. */

test(
  "global admin creates a facility via the /admin/facilities Add modal",
  {tag: "@ui"},
  async ({page, globalAdminApi}) => {
    const cfg = await loadConfig();
    await openPage(page, "/admin/facilities", cfg.ui.admin);
    await page.getByRole("button", {name: /actions\.facility\.add/}).click();
    await expect(page.getByRole("heading", {name: /forms\.facility_create\.form_name/})).toBeVisible();

    const url = "ui-created-fac";
    const name = "UI Created Facility";
    await formField(page, "name").fill(name);
    // The form proposes a URL made from the name.
    await formField(page, "url").fill(url);
    await formField(page, "meetingNotificationTemplateSubject").fill("Notification");
    await submitButton(page, "facility_create").click();
    await expectFormSuccess(page, "facility_create");

    const facilities = await globalAdminApi.getData<readonly {name: string; url: string}[]>("admin/facility/list");
    expect(facilities.filter((f) => f.url === url)).toEqual([expect.objectContaining({name, url})]);
  },
);

test("global admin creates a user via the /admin/users Add modal", {tag: "@ui"}, async ({page, globalAdminApi}) => {
  const cfg = await loadConfig();
  await openPage(page, "/admin/users", cfg.ui.admin);
  await page.getByRole("button", {name: /actions\.user\.add/}).click();
  await expect(page.getByRole("heading", {name: /forms\.user_create\.form_name/})).toBeVisible();

  const email = "ui-created-user@test.pl";
  await formField(page, "name").fill("UI Created User");
  await formField(page, "email").fill(email);
  // No password: the account is made with no way to log in.
  await submitButton(page, "user_create").click();
  await expectFormSuccess(page, "user_create");

  const {rows} = await globalAdminApi.tquery("admin/user/tquery", {
    columns: ["email", "name"],
    filter: {type: "column", column: "email", op: "=", val: email},
  });
  expect(rows).toEqual([{email, name: "UI Created User"}]);
});

readOnlyTest(
  "global admin's Add Facility modal closes on Cancel without creating",
  {tag: "@ui"},
  async ({page, globalAdminApi}) => {
    const cfg = await loadConfig();
    await openPage(page, "/admin/facilities", cfg.ui.admin);

    await page.getByRole("button", {name: /actions\.facility\.add/}).click();
    const modalTitle = page.getByRole("heading", {name: /forms\.facility_create\.form_name/});
    await expect(modalTitle).toBeVisible();
    await formField(page, "name").fill("Should Not Persist");
    await formField(page, "url").fill("should-not-persist");
    await page.getByRole("button", {name: /actions\.cancel/}).click();

    await expect(modalTitle).toHaveCount(0);

    const body = await globalAdminApi.getData<readonly {url: string}[]>("admin/facility/list");
    expect(body.some((f) => f.url === "should-not-persist")).toBe(false);
  },
);

readOnlyTest(
  "global admin's DB dumps page shows the table and offers creating a dump",
  {tag: "@ui"},
  async ({page}) => {
    const cfg = await loadConfig();
    await openPage(page, "/admin/db-dumps", cfg.ui.admin);

    const main = page.locator("main");
    await expect(
      main.getByRole("button", {name: /tables\.tables\.db_dump\.column_names\.createStatus/i}),
    ).toBeVisible();
    await expect(main.getByText("Errors:")).toHaveCount(0);
    // Only open the menu: creating or restoring a dump is not for a test.
    await main.getByRole("button", {name: "actions.db_dump.create", exact: true}).click();
    await expect(page.getByRole("button", {name: /^actions\.db_dump\.create\.from_self/})).toBeVisible();
    await expect(page.getByRole("button", {name: "actions.db_dump.create.from_rc"})).toBeVisible();
  },
);

readOnlyTest(
  "the user create form shows each validation error at its field",
  {tag: "@ui"},
  async ({page, globalAdminApi}) => {
    const cfg = await loadConfig();
    const usersCount = async () =>
      (await globalAdminApi.tquery("admin/user/tquery", {columns: ["id"], pageSize: 1})).total;
    const countBefore = await usersCount();
    await openPage(page, "/admin/users", cfg.ui.admin);
    await page.getByRole("button", {name: /actions\.user\.add/}).click();
    const form = page.locator("#user_create");
    const submit = submitButton(page, "user_create");
    const field = (name: string) => formField(form, name);

    await test.step("nothing filled in", async () => {
      await submit.click();
      await expectFormErrors(form, {name: "required"});
      // No password without an email.
      await expect(field("hasPassword")).toBeDisabled();
    });

    await test.step("the email: malformed, taken", async () => {
      await field("name").fill("Validated User");
      await field("email").fill("not-an-email");
      await submit.click();
      await expectFormErrors(form, {email: "email"});
      await field("email").fill(cfg.ui.admin.email);
      await submit.click();
      await expectFormErrors(form, {email: "unique"});
    });

    await test.step("the password: missing, too weak", async () => {
      await field("email").fill("validated-user@test.pl");
      await field("hasPassword").check();
      await expectSectionShown(field("password"), true);
      await submit.click();
      await expectFormErrors(form, {password: "required_with"});
      // The field is read-only until clicked, to keep the browser from filling it in.
      await field("password").click();
      await field("password").fill("short");
      await submit.click();
      await expectFormErrors(form, {password: "password.all_rules"});
      // Long enough, but with no upper case letter and no digit: the one error covers all the rules.
      await field("password").fill("alllowercaseletters");
      await submit.click();
      await expectFormErrors(form, {password: "password.all_rules"});
    });

    await form.getByRole("button", {name: "actions.cancel"}).click();
    expect(await usersCount()).toBe(countBefore);
  },
);
