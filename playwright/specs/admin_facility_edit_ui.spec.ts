import type {Page} from "@playwright/test";
import {loadConfig} from "../lib/config.ts";
import {ADMIN, FACILITY, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {SHOWN_TABLE_TIME} from "../helpers/dates.ts";
import {userName} from "../helpers/queries.ts";
import {
  expectFormErrors,
  expectFormSuccess,
  formField,
  showTableColumns,
  submitButton,
  tableCell,
  tableCellTexts,
  tableRows,
} from "../helpers/selectors.ts";
import {expect, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";
import {responseData} from "../lib/responses.ts";

/** The global admin's facility edit modal of the facilities list. */

async function facility(adminApi: MemoAPI, facilityId: string) {
  const res = await adminApi.get("admin/facility/list");
  const data = await responseData<readonly {id: string; name: string; url: string}[]>(res);
  const {name, url} = data.find((f) => f.id === facilityId)!;
  return {name, url};
}

/** The facilities with the given name, as the global admin's API gives them. */
async function facilitiesNamed(adminApi: MemoAPI, name: string) {
  const data =
    await adminApi.getData<readonly {name: string; url: string; meetingNotificationTemplateSubject: string | null}[]>(
      "admin/facility/list",
    );
  return data
    .filter((f) => f.name === name)
    .map(({name, url, meetingNotificationTemplateSubject}) => ({name, url, meetingNotificationTemplateSubject}));
}

/** Opens the edit modal of the seeded facility, as the global admin. */
async function openFacilityEdit(page: Page) {
  await openPage(page, "/admin/facilities", (await loadConfig()).ui.admin);
  // The list may be paged; the search brings the facility to the first page.
  await page.getByPlaceholder("actions.search").fill(FACILITY.name);
  const row = tableRows(page, FACILITY.name);
  await expect(row).toHaveCount(1);
  await row.getByRole("button", {name: "actions.edit"}).click();
  await expect(page.getByRole("heading", {name: /forms\.facility_edit\.form_name/i})).toBeVisible();
  const form = page.locator("form#facility_edit");
  await expect(formField(form, "name")).toHaveValue(FACILITY.name);
  await expect(formField(form, "url")).toHaveValue(FACILITY.url);
  return form;
}

facilityLayer.describe((artifact) => {
  readOnlyTest(
    "the facilities table shows the URL, the admins and the notification template of a facility",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      await openPage(page, "/admin/facilities", (await loadConfig()).ui.admin);
      const main = page.locator("main");
      await page.getByPlaceholder("actions.search").fill(FACILITY.name);
      const row = tableRows(main, FACILITY.name);
      await expect(row).toHaveCount(1);
      const hidden = ["meetingNotificationTemplateSubject", "createdAt", "createdBy.id"];
      await showTableColumns(page, main, "facility", hidden);
      await expect
        .poll(() => tableCellTexts(row, ["name", "url", ...hidden]))
        .toEqual({
          "name": FACILITY.name,
          "url": `/${FACILITY.url}`,
          // The seeded facility has no template.
          "meetingNotificationTemplateSubject": "—",
          "createdAt": expect.stringMatching(SHOWN_TABLE_TIME),
          "createdBy.id": await userName(globalAdminApi),
        });
      // The admins come in no order of their own.
      const admins = tableCell(row, "facilityAdmins.*.name");
      await expect(admins).toContainText(ADMIN.name);
      await expect(admins).toContainText(STAFF_ADMIN.name);
      expect((await admins.innerText()).replace(/\s+/g, "")).toHaveLength(
        `${ADMIN.name}${STAFF_ADMIN.name}`.replace(/\s+/g, "").length,
      );
    },
  );

  test(
    "the global admin renames a facility and changes its URL in the modal",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const form = await openFacilityEdit(page);
      await formField(form, "name").fill("Integration Test Facility, renamed");
      await formField(form, "url").fill("int-test-renamed");
      await submitButton(page, "facility_edit").click();
      await expectFormSuccess(page, "facility_edit");
      await expect(form).toBeHidden();
      await expect(tableRows(page, "Integration Test Facility, renamed")).toContainText("/int-test-renamed");

      expect(await facility(globalAdminApi, artifact().facilityId)).toEqual({
        name: "Integration Test Facility, renamed",
        url: "int-test-renamed",
      });
    },
  );

  test(
    "a URL taken by another facility is refused in the facility edit modal",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      await globalAdminApi.createFacility({name: "Facility with the URL", url: "int-test-taken"});

      const form = await openFacilityEdit(page);
      await formField(form, "url").fill("int-test-taken");
      await submitButton(page, "facility_edit").click();
      await expectFormErrors(form, {url: "unique"});
      await expect(page.getByText("forms.facility_edit.success")).toHaveCount(0);
      expect(await facility(globalAdminApi, artifact().facilityId)).toEqual({name: FACILITY.name, url: FACILITY.url});

      // The form stays open and can be corrected.
      await formField(form, "url").fill("int-test-free");
      await submitButton(page, "facility_edit").click();
      await expectFormSuccess(page, "facility_edit");
      expect(await facility(globalAdminApi, artifact().facilityId)).toEqual({
        name: FACILITY.name,
        url: "int-test-free",
      });
    },
  );

  test(
    "the notification template of a facility is set, and cleared again, in the modal",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const template = "Reminder: {{meeting_datetime}}";
      const form = await openFacilityEdit(page);
      const field = formField(form, "meetingNotificationTemplateSubject");
      await expect(field).toHaveValue("");
      await field.fill(template);
      await submitButton(page, "facility_edit").click();
      await expectFormSuccess(page, "facility_edit");
      await expect(form).toBeHidden();
      expect(await facilitiesNamed(globalAdminApi, FACILITY.name)).toEqual([
        {name: FACILITY.name, url: FACILITY.url, meetingNotificationTemplateSubject: template},
      ]);

      await tableRows(page, FACILITY.name).getByRole("button", {name: "actions.edit"}).click();
      await expect(field).toHaveValue(template);
      await field.fill("");
      await submitButton(page, "facility_edit").click();
      await expect(form).toBeHidden();
      expect(await facilitiesNamed(globalAdminApi, FACILITY.name)).toEqual([
        {name: FACILITY.name, url: FACILITY.url, meetingNotificationTemplateSubject: null},
      ]);
    },
  );

  test(
    "the facility create form proposes a URL made from the name, until another one is typed",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      await openPage(page, "/admin/facilities", (await loadConfig()).ui.admin);
      await page.getByRole("button", {name: /actions\.facility\.add/}).click();
      const form = page.locator("#facility_create");
      const name = formField(form, "name");
      const url = formField(form, "url");
      // Lower case, without the diacritics, with dashes for the spaces and nothing else.
      await name.fill("Zażółć  Gęślą-Jaźń (nr 2)!");
      await expect(url).toHaveValue("zazolc-gesla-jazn-nr-2");
      await name.fill("Second Name");
      await expect(url).toHaveValue("second-name");
      await url.fill("own-url");
      await name.fill("Third Name");
      await expect(url).toHaveValue("own-url");
      // Created with no notification template.
      await submitButton(page, "facility_create").click();
      await expectFormSuccess(page, "facility_create");
      await expect(tableRows(page, "Third Name")).toContainText("/own-url");
      expect(await facilitiesNamed(globalAdminApi, "Third Name")).toEqual([
        {name: "Third Name", url: "own-url", meetingNotificationTemplateSubject: null},
      ]);
    },
  );

  readOnlyTest(
    "the facility create form shows each validation error at its field",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const facilitiesCount = async () => (await globalAdminApi.getData<unknown[]>("admin/facility/list")).length;
      const countBefore = await facilitiesCount();
      await openPage(page, "/admin/facilities", (await loadConfig()).ui.admin);
      await page.getByRole("button", {name: /actions\.facility\.add/}).click();
      const form = page.locator("#facility_create");
      const submit = submitButton(page, "facility_create");
      const field = (name: string) => formField(form, name);

      await test.step("nothing filled in", async () => {
        await submit.click();
        await expectFormErrors(form, {name: "required", url: "required"});
      });

      await test.step("the name too long", async () => {
        await field("name").fill("n".repeat(251));
        await field("url").fill("validated-facility");
        await submit.click();
        await expectFormErrors(form, {name: "max.string"});
      });

      await test.step("the URL", async () => {
        await field("name").fill("Validated Facility");
        for (const [url, rule] of [
          ["admin", "not_in"],
          ["Abc", "lowercase"],
          ["ab", "regex"],
          ["ab_c d", "regex"],
          ["9abc", "regex"],
          ["a".repeat(31), "max.string"],
          [FACILITY.url, "unique"],
        ] as const) {
          await test.step(url, async () => {
            await field("url").fill(url);
            await submit.click();
            await expectFormErrors(form, {url: rule});
          });
        }
      });

      await test.step("an unknown parameter in the subject of the notification", async () => {
        await field("url").fill("validated-facility");
        await field("meetingNotificationTemplateSubject").fill("Hi {{nothing}}");
        await submit.click();
        await expectFormErrors(form, {meetingNotificationTemplateSubject: "custom.notification_template"});
      });

      await form.getByRole("button", {name: "actions.cancel"}).click();
      expect(await facilitiesCount()).toBe(countBefore);
    },
  );
});
