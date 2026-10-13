import type {Locator, Page} from "@playwright/test";
import {loadConfig} from "../lib/config.ts";
import {ADMIN, FACILITY, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {SHOWN_TABLE_TIME} from "../helpers/dates.ts";
import {userName} from "../helpers/queries.ts";
import {
  allTableRows,
  chooseInFormSelect,
  clearFilterButton,
  columnHeader,
  expectFormErrors,
  expectFormSuccess,
  expectSectionShown,
  formField,
  formSelect,
  showTableColumns,
  submitButton,
  tableCell,
  tableCellTexts,
  tableRows,
} from "../helpers/selectors.ts";
import {dropSession, expect, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";
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

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><circle cx="1" cy="1" r="1"/></svg>';
const OTHER_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2"/></svg>';
const DEFAULT_ICON_HREF = "/img/cpd_children_logo.svg";

/** The image beside the app logo. */
function logoIcon(page: Page) {
  return page.locator('image:not([href="/img/memo_logo.svg"])').first();
}

function iconHrefPattern(facilityId: string) {
  return new RegExp(`^/api/v1/system/facility/${facilityId}/icon\\?h=\\w+$`);
}

function svgDataURL(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** The parts of the icon field of a facility form. */
function iconField(form: Locator) {
  const box = form.locator('[data-field-box="iconSvg"]');
  return {
    box,
    svgInput: box.locator("textarea"),
    preview: box.locator("[data-icon-preview]"),
    editCheckbox: box.getByRole("checkbox", {name: "forms.facility_icon.edit_svg"}),
  };
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
    "the icon of a facility is set in the modal, shown beside the logo also after logging out, and removed again",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const facilityId = artifact().facilityId;
      const storedIcon = async () =>
        (await globalAdminApi.getData<readonly {id: string; iconSvg: string | null}[]>("admin/facility/list")).find(
          ({id}) => id === facilityId,
        )!.iconSvg;
      const form = await openFacilityEdit(page);
      const {box: iconBox, svgInput, preview, editCheckbox} = iconField(form);

      await test.step("set in the modal", async () => {
        await expect(preview).toHaveText("—");
        await expectSectionShown(svgInput, false);
        await editCheckbox.check();
        await expectSectionShown(svgInput, true);
        await svgInput.fill("<svg>");
        await submitButton(page, "facility_edit").click();
        await expectFormErrors(form, {iconSvg: "custom.svg_is_valid"});
        expect(await storedIcon()).toBeNull();

        await svgInput.fill(ICON);
        // The preview follows the text.
        await expect(preview.locator("img")).toHaveAttribute("src", svgDataURL(ICON));
        await submitButton(page, "facility_edit").click();
        await expectFormSuccess(page, "facility_edit");
        await expect(form).toBeHidden();
        expect(await storedIcon()).toBe(ICON);
        // The column is hidden at first.
        await expect(columnHeader(page, "iconSvg")).toHaveCount(0);
        await showTableColumns(page, page.locator("main"), "facility", ["iconSvg"]);
        await expect(tableCell(tableRows(page, FACILITY.name), "iconSvg").locator("img")).toHaveAttribute(
          "src",
          svgDataURL(ICON),
        );
      });

      await test.step("the column of the table: no sorting, a filter by the presence only", async () => {
        const main = page.locator("main");
        await globalAdminApi.createFacility({name: "Facility with no icon", url: "int-test-no-icon"});
        await page.getByPlaceholder("actions.search").fill("");
        await page.locator('[aria-description^="refresh_button"]').click();
        await expect(tableRows(main, "Facility with no icon")).toHaveCount(1);
        await expect(tableCell(tableRows(main, "Facility with no icon"), "iconSvg").locator("img")).toHaveCount(0);

        await expect(columnHeader(main, "name").getByRole("button", {name: /column_names\.name/})).toHaveCount(1);
        await expect(columnHeader(main, "iconSvg")).toContainText("iconSvg");
        await expect(columnHeader(main, "iconSvg").getByRole("button", {name: /iconSvg/})).toHaveCount(0);

        // The list may get closed by the table still settling after the refresh.
        await expect(async () => {
          await formSelect(main, "table__filter__val__iconSvg").click();
          await expect(page.getByRole("option")).toHaveCount(3, {timeout: 2000});
          await page.getByRole("option", {name: "tables.filter.non_null_value"}).click({timeout: 2000});
        }).toPass();
        await expect(tableRows(main, FACILITY.name)).toHaveCount(1);
        await expect(tableRows(main, "Facility with no icon")).toHaveCount(0);
        await chooseInFormSelect(page, "table__filter__val__iconSvg", "tables.filter.null_value");
        await expect(tableRows(main, "Facility with no icon")).toHaveCount(1);
        await expect(tableRows(main, FACILITY.name)).toHaveCount(0);
        await clearFilterButton(main, "iconSvg").click();
        await expect(tableRows(main, FACILITY.name)).toHaveCount(1);
        // The text of the image is not searched in.
        await page.getByPlaceholder("actions.search").fill("circle");
        await expect(allTableRows(main)).toHaveCount(0);
        await page.getByPlaceholder("actions.search").fill("");
      });

      await test.step("shown to a member of the facility, and on the login screen afterwards", async () => {
        await dropSession(page);
        await openPage(page, "/", STAFF);
        await expect(logoIcon(page)).toHaveAttribute("href", iconHrefPattern(facilityId));
        const iconResponse = await page.request.get((await logoIcon(page).getAttribute("href"))!);
        expect(iconResponse.headers()["content-type"]).toContain("image/svg+xml");
        expect(await iconResponse.text()).toBe(ICON);
        const href = await logoIcon(page).getAttribute("href");

        await dropSession(page);
        await openPage(page, "/");
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(logoIcon(page)).toHaveAttribute("href", href!);
      });

      await test.step("removed in the modal", async () => {
        await openFacilityEdit(page);
        await expect(preview.locator("img")).toBeVisible();
        await editCheckbox.check();
        await expect(svgInput).toHaveValue(ICON);
        await iconBox.getByRole("button", {name: "actions.clear"}).click();
        await expect(preview).toHaveText("—");
        await submitButton(page, "facility_edit").click();
        await expectFormSuccess(page, "facility_edit");
        expect(await storedIcon()).toBeNull();
      });

      await test.step("the default icon is back, also on the login screen", async () => {
        await dropSession(page);
        await openPage(page, "/", STAFF);
        // The stored icon stays until the facility of the user is known.
        await expect(logoIcon(page)).toHaveAttribute("href", DEFAULT_ICON_HREF);
        await dropSession(page);
        await openPage(page, "/");
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(logoIcon(page)).toHaveAttribute("href", DEFAULT_ICON_HREF);
      });
    },
  );

  test(
    "the logo follows the icon of the facility, and falls back to the default icon when it is gone",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const facilityId = artifact().facilityId;
      await globalAdminApi.patch(`admin/facility/${facilityId}`, {iconSvg: ICON});
      await openPage(page, "/", STAFF);
      await expect(logoIcon(page)).toHaveAttribute("href", iconHrefPattern(facilityId));
      const href = (await logoIcon(page).getAttribute("href"))!;

      await test.step("the collapsed menu shows the same icon", async () => {
        const nav = page.getByRole("navigation");
        await page.locator("title=actions.collapse").click();
        await expect(nav.locator(`img[src="${href}"]`)).toBeAttached();
        await expect(logoIcon(page)).toHaveCount(0);
        await page.locator("title=actions.expand").click();
        await expect(logoIcon(page)).toHaveAttribute("href", href);
      });

      await test.step("a changed icon arrives with the refreshed data", async () => {
        await globalAdminApi.patch(`admin/facility/${facilityId}`, {iconSvg: OTHER_ICON});
        await page.locator('[aria-description^="refresh_button"]').click();
        await expect(logoIcon(page)).not.toHaveAttribute("href", href);
        await expect(logoIcon(page)).toHaveAttribute("href", iconHrefPattern(facilityId));
        expect(await (await page.request.get((await logoIcon(page).getAttribute("href"))!)).text()).toBe(OTHER_ICON);
      });

      await test.step("the icon removed while the browser remembers it: the default one on the login screen", async () => {
        const rememberedHref = (await logoIcon(page).getAttribute("href"))!;
        await dropSession(page);
        await globalAdminApi.patch(`admin/facility/${facilityId}`, {iconSvg: null});
        expect((await page.request.get(rememberedHref)).status()).toBe(404);
        // The browser may keep showing the icon from its cache, until the next login. An address
        // it has not loaded stands for a browser without the icon in the cache.
        const hash = new URL(rememberedHref, "http://localhost").searchParams.get("h")!;
        await openPage(page, "/");
        await page.evaluate(
          ({key, hash}) => localStorage.setItem(key, localStorage.getItem(key)!.replace(hash, `${hash}0`)),
          {key: "persistence:FacilityIcon", hash},
        );
        await openPage(page, "/");
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(logoIcon(page)).toHaveAttribute("href", DEFAULT_ICON_HREF);
        expect(await page.evaluate(() => localStorage.getItem("persistence:FacilityIcon"))).toContain(`${hash}0`);
      });
    },
  );

  test("a facility is created with an icon loaded from a file", {tag: "@ui"}, async ({page, globalAdminApi}) => {
    await openPage(page, "/admin/facilities", (await loadConfig()).ui.admin);
    await page.getByRole("button", {name: /actions\.facility\.add/}).click();
    const form = page.locator("#facility_create");
    await formField(form, "name").fill("Facility with an icon");
    const {box, svgInput, preview, editCheckbox} = iconField(form);
    await expect(preview).toHaveText("—");
    // The file is loaded without opening the text of the image.
    await box.locator('input[type="file"]').setInputFiles({
      name: "icon.svg",
      mimeType: "image/svg+xml",
      // The white space around the image is dropped.
      buffer: Buffer.from(`\n${ICON}\n`),
    });
    await expect(preview.locator("img")).toHaveAttribute("src", svgDataURL(ICON));
    await expectSectionShown(svgInput, false);
    await editCheckbox.check();
    await expectSectionShown(svgInput, true);
    await expect(svgInput).toHaveValue(ICON);
    // The same file can be loaded again, after the image was cleared.
    await box.getByRole("button", {name: "actions.clear"}).click();
    await expect(svgInput).toHaveValue("");
    await expect(preview).toHaveText("—");
    await box.locator('input[type="file"]').setInputFiles({
      name: "icon.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(ICON),
    });
    await expect(svgInput).toHaveValue(ICON);

    await submitButton(page, "facility_create").click();
    await expectFormSuccess(page, "facility_create");
    const created = (
      await globalAdminApi.getData<readonly {name: string; iconSvg: string | null}[]>("admin/facility/list")
    ).filter(({name}) => name === "Facility with an icon");
    expect(created).toMatchObject([{iconSvg: ICON}]);
    await showTableColumns(page, page.locator("main"), "facility", ["iconSvg"]);
    await expect(tableCell(tableRows(page, "Facility with an icon"), "iconSvg").locator("img")).toHaveAttribute(
      "src",
      svgDataURL(ICON),
    );
  });

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
