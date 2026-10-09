import type {Locator, Page} from "@playwright/test";
import {shownDateTime} from "../helpers/dates.ts";
import {attributeToCreate, clientAttributes} from "../helpers/queries.ts";
import {savedFile, stubSaveFilePicker, exportTable} from "../helpers/saved_file.ts";
import {
  addToList,
  allTableRows,
  attributeRow,
  attributeValue,
  chooseAllInFormSelect,
  chooseInFormSelect,
  clearAllFiltersButton,
  clearFilterButton,
  columnHeader,
  expectFormErrors,
  expectFormSuccess,
  expectSectionShown,
  formField,
  formSelect,
  listInputs,
  removeFirstFromList,
  showTableColumns,
  submitButton,
  tableCell,
  tableCellTexts,
  tableRows,
  tableRowsWithCell,
  clickOutside,
} from "../helpers/selectors.ts";
import {
  FILLED_VALUES,
  REQUIRED_ONLY_LABEL,
  SIZE_DICT_NAME,
  SIZE_NAMES,
  VALUE_API_NAMES,
  VALUE_ATTRS,
  attributeValuesLayer,
} from "../lib/layers/attribute_values.ts";
import {ADMIN, FACILITY, STAFF} from "../lib/layers/facility.ts";
import {MemoAPI, expect, login, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * UI tests of the values of custom attributes, on the layer's client attributes of each type and
 * requirement level: the client form, the client details, the clients table and the exports.
 */

/** The columns of the layer's attributes in the clients table: a list has one of its length too. */
const TABLE_COLUMNS = [...VALUE_API_NAMES, "e2eTags.count"];

const EMPTY_VALUE = "—";

/** The time of the filled client as the app shows it: in the time zone of the browser. */
const MOMENT = shownDateTime(FILLED_VALUES.e2eMoment);

/** The values of the filled client as the details show them. */
const FILLED_VIEW: Readonly<Record<string, string | RegExp>> = {
  e2eFlag: "bool_values.yes",
  e2eDay: "czwartek, 29.02.2024",
  e2eMoment: `poniedziałek, ${MOMENT}`,
  e2eCount: "42",
  e2eLabel: "Alpha",
  e2eStory: /^Line one\s+Line two$/,
  e2eSize: "Medium",
  e2eTags: "red tape, blue",
  e2eNumbers: "3, 1, 2",
  e2eDays: /^piątek, 05\.01\.2024\s*niedziela, 24\.12\.2023$/,
  e2eSizes: "Large, Small",
  e2eLegacy: "Old value",
};

const editButton = (form: Locator) => form.getByRole("button", {name: "actions.edit"});

async function expectLevelMark(form: Locator, apiName: string, level: string) {
  await expect(attributeRow(form, apiName).locator(`title=attributes.requirement_level.${level}`)).toBeVisible();
}

attributeValuesLayer.describe((artifact) => {
  const clientsPath = () => `facility/${artifact().facilityId}/user/client`;
  const e2eValues = async (api: MemoAPI, clientId: string) => {
    const client = await clientAttributes(api, artifact().facilityId, clientId);
    return Object.fromEntries(VALUE_API_NAMES.filter((name) => name in client).map((name) => [name, client[name]]));
  };
  /**
   * Takes the time value from the filled client: the edit form sends it back as it got it, which
   * the server refuses, so a client with one cannot be saved there (see the test of that).
   */
  const clearMoment = async (api: MemoAPI) =>
    api.patch(`${clientsPath()}/${artifact().filledClientId}`, {client: {e2eMoment: null}});
  const clientIdByName = async (api: MemoAPI, name: string) => {
    const {rows} = await api.tquery<{id: string}>(`${clientsPath()}/tquery`, {
      columns: ["id"],
      filter: {type: "column", column: "name", op: "=", val: name},
    });
    expect(rows).toHaveLength(1);
    return rows[0]!.id;
  };
  /** Opens the clients table as staff, and shows the columns of the layer's attributes. */
  async function openTableWithAttributeColumns(page: Page) {
    await openPage(page, `/${FACILITY.url}/clients`, STAFF);
    const main = page.locator("main");
    const header = (apiName: string) => columnHeader(main, `client.${apiName}`);
    await expect(tableRows(main, artifact().adultClientInfos[0]!.name)).toHaveCount(1);
    await expect(header("e2eLabel")).toHaveCount(0);
    await showTableColumns(
      page,
      main,
      "client",
      TABLE_COLUMNS.map((apiName) => `client.${apiName}`),
    );
    return main;
  }

  async function openDetails(page: Page, client: {id: string; name: string}) {
    await openPage(page, `/${FACILITY.url}/clients/${client.id}`);
    const form = page.locator("form#client_edit");
    await expect(formField(form, "name")).toHaveValue(client.name);
    return form;
  }

  readOnlyTest(
    "client details show the value of each type, and hide the empty optional ones",
    {tag: "@ui"},
    async ({page}) => {
      const [adam, bea, carl] = artifact().adultClientInfos;
      await login(page, STAFF);

      await test.step("a client with every value", async () => {
        const form = await openDetails(page, adam!);
        for (const [apiName, text] of Object.entries(FILLED_VIEW)) {
          await expect(attributeValue(form, apiName), apiName).toHaveText(text);
          await expectSectionShown(attributeRow(form, apiName), true);
        }
        // The attributes come in their order, under the headings of the separators.
        expect(
          await form
            .locator('[data-attribute^="e2e"]')
            .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-attribute"))),
        ).toEqual(VALUE_API_NAMES);
        const text = await form.innerText();
        const places = ["E2E basics", "E2E flag", "E2E size", "E2E lists", "E2E tags", "E2E legacy"].map((label) =>
          text.indexOf(label),
        );
        expect(places).not.toContain(-1);
        expect(places).toEqual(places.toSorted((a, b) => a - b));
        for (const {apiName, requirementLevel, type} of Object.values(VALUE_ATTRS)) {
          if (type !== "separator") {
            await expectLevelMark(form, apiName, requirementLevel);
          }
        }
      });

      await test.step("a client with the required values only", async () => {
        const form = await openDetails(page, bea!);
        await expect(attributeValue(form, "e2eLabel")).toHaveText(REQUIRED_ONLY_LABEL);
        await expect(attributeValue(form, "e2eSize")).toHaveText("Small");
        await expect(attributeValue(form, "e2eSizes")).toHaveText("Medium");
        // The recommended one is shown empty; the optional ones and the `empty` one are folded.
        await expect(attributeValue(form, "e2eDay")).toHaveText(EMPTY_VALUE);
        await expectSectionShown(attributeRow(form, "e2eDay"), true);
        for (const apiName of [
          "e2eFlag",
          "e2eMoment",
          "e2eCount",
          "e2eStory",
          "e2eTags",
          "e2eNumbers",
          "e2eDays",
          "e2eLegacy",
        ]) {
          await expectSectionShown(attributeRow(form, apiName), false);
        }
      });

      await test.step("a client from before the attributes: the required ones are shown empty", async () => {
        const form = await openDetails(page, carl!);
        for (const apiName of ["e2eLabel", "e2eSize", "e2eSizes", "e2eDay"]) {
          await expect(attributeValue(form, apiName)).toHaveText(EMPTY_VALUE);
          await expectSectionShown(attributeRow(form, apiName), true);
        }
      });
    },
  );

  test(
    "the client details, the create form and the column chooser follow a changed order of the attributes",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, attrIds, adultClientInfos} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const attributes = await adminApi.getData<readonly {id: string; defaultOrder: number}[]>("system/attribute/list");
      const flagOrder = attributes.find(({id}) => id === attrIds.flag)!.defaultOrder;
      // The last attribute but one is moved to the place of the first one.
      await adminApi.patch(`facility/${facilityId}/admin/attribute/${attrIds.sizes}`, {defaultOrder: flagOrder});
      const reordered = ["e2eSizes", ...VALUE_API_NAMES.filter((apiName) => apiName !== "e2eSizes")];
      /** The attributes of the layer in the form, in order, the folded and hidden ones too. */
      const attributesOrder = (form: Locator) =>
        form
          .locator('[data-attribute^="e2e"]')
          .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-attribute")));

      await login(page, STAFF);
      const details = await openDetails(page, adultClientInfos[0]!);
      await expect(attributeValue(details, "e2eSizes")).toHaveText("Large, Small");
      expect(await attributesOrder(details)).toEqual(reordered);

      await openPage(page, `/${FACILITY.url}/clients/create`);
      const createForm = page.locator("#client_create");
      await expect(attributeRow(createForm, "e2eSizes")).toBeVisible();
      expect(await attributesOrder(createForm)).toEqual(reordered);

      await openPage(page, `/${FACILITY.url}/clients`);
      await page.locator("main").getByRole("button", {name: "tables.choose_columns"}).click();
      const boxes = page.getByRole("checkbox", {name: /^tables\.tables\.client\.column_names\.client\.e2e\w+$/});
      await expect(boxes).toHaveCount(reordered.length);
      expect(
        await boxes.evaluateAll((inputs) =>
          inputs.map((input) => (input.getAttribute("aria-label") ?? input.closest("label")?.textContent ?? "").trim()),
        ),
      ).toEqual(reordered.map((apiName) => `tables.tables.client.column_names.client.${apiName}`));
    },
  );

  test(
    "the client create form has a control for each type, and saves the values",
    {tag: "@ui"},
    async ({page, api}) => {
      const {sizeIds} = artifact();
      await openPage(page, `/${FACILITY.url}/clients/create`, STAFF);
      const form = page.locator("#client_create");
      const control = (apiName: string, selector: string) => attributeRow(form, apiName).locator(selector);

      await test.step("the controls", async () => {
        await expect(control("e2eFlag", 'input[type="checkbox"]')).toBeVisible();
        await expect(control("e2eDay", 'input[type="date"]')).toBeVisible();
        await expect(control("e2eCount", 'input[type="number"]')).toBeVisible();
        await expect(control("e2eLabel", 'input[type="text"]')).toBeVisible();
        await expect(control("e2eStory", "textarea")).toBeVisible();
        await expect(formSelect(form, "client.e2eSize")).toHaveAttribute("aria-multiselectable", "false");
        await expect(formSelect(form, "client.e2eSizes")).toHaveAttribute("aria-multiselectable", "true");
        // A list starts with no value, and so with no input.
        for (const apiName of ["e2eTags", "e2eNumbers", "e2eDays"]) {
          await expect(listInputs(form, apiName)).toHaveCount(0);
        }
        // The app has no control for a time yet: the row has the label and the level only.
        await expectSectionShown(attributeRow(form, "e2eMoment"), true);
        await expect(control("e2eMoment", "input, textarea")).toHaveCount(0);
        // An attribute of the level `empty` is offered only while it has a value.
        await expectSectionShown(attributeRow(form, "e2eLegacy"), false);
        for (const {apiName, requirementLevel, type} of Object.values(VALUE_ATTRS)) {
          if (type !== "separator") {
            await expectLevelMark(form, apiName, requirementLevel);
          }
        }
      });

      const name = "Form Filled Client";
      await formField(form, "name").fill(name);
      await chooseInFormSelect(page, "client.typeDictId", /clientType\.adult/);
      await formField(form, "client.e2eFlag").check();
      await formField(form, "client.e2eDay").fill("2024-02-29");
      await formField(form, "client.e2eCount").fill("-12");
      await formField(form, "client.e2eLabel").fill("Typed label");
      await form.locator('textarea[name="client.e2eStory"]').fill("First line\nSecond line");
      await chooseInFormSelect(page, "client.e2eSize", "Large");
      await addToList(form, "e2eTags", "first tag");
      await addToList(form, "e2eTags", "second tag");
      await addToList(form, "e2eNumbers", "7");
      await addToList(form, "e2eNumbers", "5");
      await addToList(form, "e2eDays", "2025-12-31");
      await chooseAllInFormSelect(page, form, "client.e2eSizes", ["Medium", "Small"]);
      await expect(control("e2eNumbers", 'input[type="number"]')).toHaveCount(2);
      await expect(control("e2eDays", 'input[type="date"]')).toHaveCount(1);
      await submitButton(page, "client_create").click();
      await expectFormSuccess(page, "client_create");

      const staffApi = await api.loggedInAs(STAFF);
      const clientId = await clientIdByName(staffApi, name);
      expect(await e2eValues(staffApi, clientId)).toEqual({
        e2eFlag: true,
        e2eDay: "2024-02-29",
        e2eCount: -12,
        e2eLabel: "Typed label",
        e2eStory: "First line\nSecond line",
        e2eSize: sizeIds.large,
        e2eTags: ["first tag", "second tag"],
        e2eNumbers: [7, 5],
        e2eDays: ["2025-12-31"],
        e2eSizes: [sizeIds.medium, sizeIds.small],
      });

      await test.step("the details of the new client show them", async () => {
        await expect(page).toHaveURL(new RegExp(`/clients/${clientId}$`));
        const details = page.locator("form#client_edit");
        for (const [apiName, text] of Object.entries({
          e2eFlag: "bool_values.yes",
          e2eDay: "czwartek, 29.02.2024",
          e2eCount: "-12",
          e2eLabel: "Typed label",
          e2eStory: /^First line\s+Second line$/,
          e2eSize: "Large",
          e2eTags: "first tag, second tag",
          e2eNumbers: "7, 5",
          e2eDays: "środa, 31.12.2025",
          e2eSizes: "Medium, Small",
        })) {
          await expect(attributeValue(details, apiName), apiName).toHaveText(text);
        }
      });
    },
  );

  test(
    "a required attribute left empty blocks the save, with the error at its field; the others do not",
    {tag: "@ui"},
    async ({page, api}) => {
      const {sizeIds, adultClientInfos} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      const requiredErrors = {
        "client.e2eLabel": "required",
        "client.e2eSize": "required",
        // An empty list is sent as one, not as no value.
        "client.e2eSizes": "min.array",
      };

      await test.step("the edit form of a client from before the attributes", async () => {
        const carl = adultClientInfos[2]!;
        await login(page, STAFF);
        const form = await openDetails(page, carl);
        await editButton(form).click();
        await formField(form, "client.addressCity").fill("Radom");
        await submitButton(page, "client_edit").click();
        await expectFormErrors(form, requiredErrors);
        for (const apiName of ["e2eLabel", "e2eSize", "e2eSizes"]) {
          await expect(attributeRow(form, apiName).locator('ul[aria-live="polite"] li')).toHaveText(
            /^validation\.(required|min\.array)/,
          );
        }
        expect(await clientAttributes(staffApi, artifact().facilityId, carl.id)).toMatchObject({
          addressCity: "Warszawa",
        });
      });

      await test.step("the create form", async () => {
        await openPage(page, `/${FACILITY.url}/clients/create`);
        const form = page.locator("#client_create");
        const name = "Required Only Client";
        await formField(form, "name").fill(name);
        await chooseInFormSelect(page, "client.typeDictId", /clientType\.adult/);
        await submitButton(page, "client_create").click();
        await expectFormErrors(form, requiredErrors);
        await expect(formField(form, "client.e2eLabel")).toHaveAttribute("aria-invalid", "true");

        await formField(form, "client.e2eLabel").fill("Given");
        await submitButton(page, "client_create").click();
        const {"client.e2eLabel": _label, ...otherErrors} = requiredErrors;
        await expectFormErrors(form, otherErrors);

        // With the recommended and the optional ones left empty.
        await chooseInFormSelect(page, "client.e2eSize", "Small");
        await chooseAllInFormSelect(page, form, "client.e2eSizes", ["Large"]);
        await submitButton(page, "client_create").click();
        await expectFormSuccess(page, "client_create");
        expect(await e2eValues(staffApi, await clientIdByName(staffApi, name))).toEqual({
          // The checkbox left alone is saved as a "no".
          e2eFlag: false,
          e2eLabel: "Given",
          e2eSize: sizeIds.small,
          e2eSizes: [sizeIds.large],
        });
      });
    },
  );

  test("the values of each type are changed and cleared in the edit form", {tag: "@ui"}, async ({page, api}) => {
    const {sizeIds, adultClientInfos, filledClientId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await clearMoment(staffApi);
    await login(page, STAFF);
    const form = await openDetails(page, adultClientInfos[0]!);
    await editButton(form).click();

    await test.step("the form starts from the values", async () => {
      await expect(formField(form, "client.e2eFlag")).toBeChecked();
      await expect(formField(form, "client.e2eDay")).toHaveValue("2024-02-29");
      await expect(formField(form, "client.e2eCount")).toHaveValue("42");
      await expect(formField(form, "client.e2eLabel")).toHaveValue("Alpha");
      await expect(form.locator('textarea[name="client.e2eStory"]')).toHaveValue("Line one\nLine two");
      await expect(formSelect(form, "client.e2eSize")).toContainText("Medium");
      await expect(formSelect(form, "client.e2eSizes")).toContainText("Large");
      await expect(formSelect(form, "client.e2eSizes")).toContainText("Small");
      await expect(listInputs(form, "e2eTags")).toHaveCount(2);
      await expect(listInputs(form, "e2eTags").first()).toHaveValue("red tape");
      await expect(listInputs(form, "e2eNumbers")).toHaveCount(3);
      await expect(listInputs(form, "e2eDays").last()).toHaveValue("2023-12-24");
      // With a value, the attribute of the level `empty` is there to be cleared.
      await expectSectionShown(attributeRow(form, "e2eLegacy"), true);
      await expect(formField(form, "client.e2eLegacy")).toHaveValue("Old value");
    });

    await formField(form, "client.e2eFlag").uncheck();
    await formField(form, "client.e2eDay").fill("");
    await formField(form, "client.e2eCount").fill("7");
    await formField(form, "client.e2eLabel").fill("Omega");
    await form.locator('textarea[name="client.e2eStory"]').fill("");
    await chooseInFormSelect(page, "client.e2eSize", "Small");
    await formField(form, "client.e2eLegacy").fill("");
    await removeFirstFromList(form, "e2eTags");
    await expect(listInputs(form, "e2eTags")).toHaveValue("blue");
    for (let count = 0; count < 3; count++) {
      await removeFirstFromList(form, "e2eNumbers");
    }
    await addToList(form, "e2eDays", "2026-06-01");
    await chooseAllInFormSelect(page, form, "client.e2eSizes", ["Medium"]);
    await submitButton(page, "client_edit").click();
    await expectFormSuccess(page, "client_edit");

    expect(await e2eValues(staffApi, filledClientId)).toEqual({
      // An unticked box is a "no", not the lack of a value.
      e2eFlag: false,
      e2eCount: 7,
      e2eLabel: "Omega",
      e2eSize: sizeIds.small,
      e2eTags: ["blue"],
      e2eDays: ["2024-01-05", "2023-12-24", "2026-06-01"],
      e2eSizes: [sizeIds.large, sizeIds.small, sizeIds.medium],
    });
    await expect(attributeValue(form, "e2eFlag")).toHaveText("bool_values.no");
    await expect(attributeValue(form, "e2eDay")).toHaveText(EMPTY_VALUE);
    await expectSectionShown(attributeRow(form, "e2eLegacy"), false);
  });

  test(
    "an edit of another field leaves the empty attributes empty, but for a checkbox",
    {tag: "@ui"},
    async ({page, api}) => {
      const {sizeIds, adultClientInfos, requiredOnlyClientId} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      await login(page, STAFF);
      const form = await openDetails(page, adultClientInfos[1]!);
      await editButton(form).click();
      await expect(formField(form, "client.e2eFlag")).not.toBeChecked();
      await formField(form, "client.addressCity").fill("Radom");
      await submitButton(page, "client_edit").click();
      await expectFormSuccess(page, "client_edit");
      expect(await clientAttributes(staffApi, artifact().facilityId, requiredOnlyClientId)).toMatchObject({
        addressCity: "Radom",
      });
      // A checkbox has no state for "no value": saved unticked, it is a "no" from then on.
      expect(await e2eValues(staffApi, requiredOnlyClientId)).toEqual({
        e2eFlag: false,
        e2eLabel: REQUIRED_ONLY_LABEL,
        e2eSize: sizeIds.small,
        e2eSizes: [sizeIds.medium],
      });
    },
  );

  readOnlyTest("the number field takes an integer only", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/clients/create`, STAFF);
    const form = page.locator("#client_create");
    await formField(form, "name").fill("Not Created");
    await chooseInFormSelect(page, "client.typeDictId", /clientType\.adult/);
    await formField(form, "client.e2eLabel").fill("x".repeat(251));
    await formField(form, "client.e2eCount").fill("1.5");
    await chooseInFormSelect(page, "client.e2eSize", "Small");
    await chooseAllInFormSelect(page, form, "client.e2eSizes", ["Small"]);
    await submitButton(page, "client_create").click();
    await expectFormErrors(form, {"client.e2eLabel": "max.string", "client.e2eCount": "integer"});
    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients/create$`));
  });

  readOnlyTest(
    "the clients table has a column for each attribute, with the values formatted",
    {tag: "@ui"},
    async ({page}) => {
      const [adam, bea, carl] = artifact().adultClientInfos;
      const main = await openTableWithAttributeColumns(page);

      const cells = async (name: string) => {
        const texts = await tableCellTexts(
          tableRows(main, name),
          TABLE_COLUMNS.map((apiName) => `client.${apiName}`),
        );
        return Object.fromEntries(Object.entries(texts).map(([column, text]) => [column.replace("client.", ""), text]));
      };
      await expect(tableCell(tableRows(main, adam!.name), "client.e2eLabel")).toHaveText("Alpha");
      expect(await cells(adam!.name)).toEqual({
        "e2eFlag": "bool_values.yes",
        "e2eDay": "calendar.weekday_overrides.czw. , 29.02.2024",
        "e2eMoment": `calendar.weekday_overrides.pon. , ${MOMENT}`,
        "e2eCount": "42",
        "e2eLabel": "Alpha",
        "e2eStory": "Line one Line two",
        "e2eSize": "Medium",
        "e2eTags": "red tape, blue",
        "e2eTags.count": "2",
        "e2eNumbers": "3, 1, 2",
        // The dates of a list are not formatted, unlike a single date.
        "e2eDays": "2024-01-05, 2023-12-24",
        "e2eSizes": "Large, Small",
        "e2eLegacy": "Old value",
      });
      const empty = Object.fromEntries(TABLE_COLUMNS.map((apiName) => [apiName, EMPTY_VALUE]));
      expect(await cells(bea!.name)).toEqual({
        ...empty,
        "e2eLabel": REQUIRED_ONLY_LABEL,
        "e2eSize": "Small",
        "e2eSizes": "Medium",
        "e2eTags.count": "0",
      });
      expect(await cells(carl!.name)).toEqual({...empty, "e2eTags.count": "0"});

      await test.step("sorting by a value: the clients with none come first", async () => {
        const header = columnHeader(main, "client.e2eLabel");
        const sortButton = header.getByRole("button", {name: /column_names\.client\.e2eLabel/});
        // "Alpha" and "Beta" after the eight clients with no label.
        await expect(async () => {
          await sortButton.click();
          await expect(allTableRows(main).last()).toContainText(bea!.name, {timeout: 2_000});
        }).toPass();
        await expect(allTableRows(main).nth(8)).toContainText(adam!.name);
        await sortButton.click();
        await expect(allTableRows(main).first()).toContainText(bea!.name);
        await expect(allTableRows(main).nth(1)).toContainText(adam!.name);
      });
    },
  );

  readOnlyTest(
    "the column of an attribute has a filter for its type, but for a list of numbers or dates",
    {tag: "@ui"},
    async ({page}) => {
      readOnlyTest.setTimeout(120_000);
      const [adam, bea] = artifact().adultClientInfos.map(({name}) => name);
      const main = await openTableWithAttributeColumns(page);
      const expectClients = async (count: number, ...names: readonly string[]) => {
        await expect(main.getByText(`tables.tables.client.summary{count:${count}}`)).toBeVisible();
        await expect(allTableRows(main)).toHaveCount(count);
        for (const name of names) {
          await expect(tableRows(main, name), name).toHaveCount(1);
        }
      };
      const field = (kind: "val" | "from" | "to", apiName: string) =>
        formField(main, `table.filter.${kind}_client.${apiName}`);
      const select = (kind: "val" | "op", apiName: string, option: string | RegExp) =>
        chooseInFormSelect(page, `table.filter.${kind}_client.${apiName}`, option);
      const clear = async (apiName: string) => {
        await clearFilterButton(main, `client.${apiName}`).click();
        await expectClients(10);
      };
      const closeList = () => clickOutside(page);
      await expectClients(10);

      await test.step("a checkbox: yes, no, any value, no value", async () => {
        await select("val", "e2eFlag", "bool_values.yes");
        await expectClients(1, adam!);
        await select("val", "e2eFlag", "bool_values.no");
        await expectClients(0);
        await select("val", "e2eFlag", "tables.filter.non_null_value");
        await expectClients(1, adam!);
        await select("val", "e2eFlag", "tables.filter.null_value");
        await expectClients(9, bea!);
        await clear("e2eFlag");
      });

      await test.step("a date and a time: a range of days", async () => {
        await field("from", "e2eDay").fill("2024-03-01");
        await expectClients(0);
        await field("from", "e2eDay").fill("2024-02-01");
        await field("to", "e2eDay").fill("2024-02-29");
        await expectClients(1, adam!);
        await clear("e2eDay");
        // The whole of the day in the time zone of the browser.
        await field("from", "e2eMoment").fill("2024-03-04");
        await field("to", "e2eMoment").fill("2024-03-04");
        await expectClients(1, adam!);
        await field("from", "e2eMoment").fill("2024-03-05");
        await field("to", "e2eMoment").fill("2024-03-05");
        await expectClients(0);
        await clear("e2eMoment");
      });

      await test.step("a number, and the length of a list: a range", async () => {
        await field("from", "e2eCount").fill("43");
        await expectClients(0);
        await field("from", "e2eCount").fill("42");
        await field("to", "e2eCount").fill("42");
        await expectClients(1, adam!);
        await clear("e2eCount");
        await field("from", "e2eTags.count").fill("1");
        await expectClients(1, adam!);
        await clear("e2eTags.count");
      });

      await test.step("a text: a part of it, the whole of it, no value", async () => {
        await field("val", "e2eLabel").fill("LPH");
        await expectClients(1, adam!);
        await select("op", "e2eLabel", "tables.filter.textual.eq");
        await expectClients(0);
        await field("val", "e2eLabel").fill(REQUIRED_ONLY_LABEL);
        await expectClients(1, bea!);
        await clear("e2eLabel");
        // A text of several lines, and a list of texts, are searched in the same way.
        await field("val", "e2eStory").fill("line two");
        await expectClients(1, adam!);
        await select("op", "e2eStory", "tables.filter.null_value");
        await expectClients(9, bea!);
        await clear("e2eStory");
        await field("val", "e2eTags").fill("tape");
        await expectClients(1, adam!);
        await clear("e2eTags");
      });

      await test.step("a dictionary position: any of the chosen ones", async () => {
        await select("val", "e2eSize", "Small");
        await expectClients(1, bea!);
        await page.getByRole("option", {name: "Medium"}).click();
        await expectClients(2, adam!, bea!);
        await closeList();
        await clear("e2eSize");
      });

      await test.step("a list of dictionary positions: all, any or exactly the chosen ones", async () => {
        const mode = (name: string) =>
          columnHeader(main, "client.e2eSizes").getByText(`tables.filter.set_operation.${name}.short`).click();
        await select("val", "e2eSizes", "Large");
        await closeList();
        // Adam has the large and the small one, Bea the medium one.
        await expectClients(1, adam!);
        await mode("=");
        await expectClients(0);
        // The eight clients with no position have none but the chosen one, too.
        await mode("has_only");
        await expectClients(8);
        await expect(tableRows(main, adam!)).toHaveCount(0);
        await select("val", "e2eSizes", "Medium");
        await closeList();
        await expectClients(9, bea!);
        await mode("has_any");
        await expectClients(2, adam!, bea!);
        await mode("has_all");
        await expectClients(0);
        await clear("e2eSizes");
      });

      await test.step("a list of numbers or of dates has no filter", async () => {
        for (const apiName of ["e2eNumbers", "e2eDays"]) {
          await expect(columnHeader(main, `client.${apiName}`)).toBeVisible();
          await expect(columnHeader(main, `client.${apiName}`).locator("input, [role=combobox]")).toHaveCount(0);
        }
      });

      await test.step("several filters narrow the list together, and are cleared with one button", async () => {
        await field("val", "e2eLabel").fill("a");
        await expectClients(2, adam!, bea!);
        await select("val", "e2eSize", "Small");
        await closeList();
        await expectClients(1, bea!);
        await expect(clearAllFiltersButton(main)).toBeEnabled();
        await clearAllFiltersButton(main).click();
        await expectClients(10);
        await expect(field("val", "e2eLabel")).toHaveValue("");
        await expect(clearAllFiltersButton(main)).toBeDisabled();
      });
    },
  );

  readOnlyTest(
    "the tables of the attributes, the dictionaries and the positions describe each of the layer's",
    {tag: "@ui"},
    async ({page}) => {
      const main = page.locator("main");
      const row = (label: string) => tableRowsWithCell(main, "displayName", label);
      const technicals = `/${FACILITY.url}/admin/technicals`;

      await test.step("the attributes", async () => {
        await openPage(page, `${technicals}/attributes`, ADMIN);
        const columns = ["facility.name", "isFixed", "table", "type", "isMultiValue", "requirementLevel"];
        const orders: number[] = [];
        for (const def of Object.values(VALUE_ATTRS)) {
          const label = def.name.slice(1);
          await expect(row(label), label).toHaveCount(1);
          expect(await tableCellTexts(row(label), columns), label).toEqual({
            "facility.name": FACILITY.name,
            "isFixed": "bool_values.no",
            "table": "clients",
            "type": def.type === "dict" ? `dict: ${SIZE_DICT_NAME}` : def.type,
            "isMultiValue": def.isMultiValue ? "bool_values.yes" : "bool_values.no",
            "requirementLevel": def.requirementLevel,
          });
          orders.push(Number((await tableCellTexts(row(label), ["defaultOrder"])).defaultOrder));
        }
        // In their order, after the attributes the app has of its own.
        expect(orders[0]).toBeGreaterThan(1);
        expect(orders).toEqual(orders.map((_, index) => orders[0]! + index));
        // An attribute of the app, of no facility; a single-value one has no multi-value flag.
        expect(await tableCellTexts(row("attributes.attributes.client.birthDate"), columns)).toEqual({
          "facility.name": "—",
          "isFixed": "bool_values.yes",
          "table": "clients",
          "type": "date",
          "isMultiValue": "—",
          "requirementLevel": "recommended",
        });
      });

      await test.step("the dictionaries, with the count of the positions", async () => {
        await openPage(page, `${technicals}/dictionaries`);
        const label = SIZE_DICT_NAME.slice(1);
        await expect(row(label)).toHaveCount(1);
        expect(await tableCellTexts(row(label), ["facility.name", "isFixed", "isExtendable"])).toEqual({
          "facility.name": FACILITY.name,
          "isFixed": "bool_values.no",
          "isExtendable": "bool_values.yes",
        });
        await expect(tableCell(row(label), "positions.count")).toContainText(String(SIZE_NAMES.length));
        await row(label).getByRole("link", {name: label}).click();
        await expect(page).toHaveURL(new RegExp(`/dictionaries/(\\./)?${artifact().sizeDictId}$`));
      });

      await test.step("the positions of the dictionary, in their order", async () => {
        await expect(allTableRows(main)).toHaveCount(SIZE_NAMES.length);
        for (const [index, name] of SIZE_NAMES.entries()) {
          const columns = ["defaultOrder", "displayName", "facility.name", "isFixed", "isDisabled"];
          expect(await tableCellTexts(allTableRows(main).nth(index), columns)).toEqual({
            "defaultOrder": String(index + 1),
            "displayName": name.slice(1),
            "facility.name": FACILITY.name,
            "isFixed": "bool_values.no",
            "isDisabled": "bool_values.no",
          });
        }
      });
    },
  );

  readOnlyTest("the export of the clients table has the attribute columns shown", {tag: "@ui"}, async ({page}) => {
    await stubSaveFilePicker(page);
    const main = await openTableWithAttributeColumns(page);
    const csv = (await exportTable(page, main)).bytes.toString("utf8");
    const [headerLine] = csv.split(/\r?\n/);
    for (const apiName of TABLE_COLUMNS) {
      expect(headerLine).toContain(`column_names.client.${apiName}`);
    }
    // A text of several lines and a list are quoted; the list is a value per line.
    expect(csv).toMatch(
      new RegExp(
        `bool_values\\.yes,29\\.02\\.2024,"${MOMENT}",42,Alpha,"Line one\\r?\\nLine two",Medium,` +
          `"red tape\\r?\\nblue",2,"3\\r?\\n1\\r?\\n2","2024-01-05\\r?\\n2023-12-24","Large\\r?\\nSmall","Old value"`,
      ),
    );
    expect(csv).toMatch(/"Bea Kowalski",[^\n]*,,,,,Beta,,Small,,0,,,Medium,,/);
  });

  readOnlyTest("the export of a single client has a line for each attribute", {tag: "@ui"}, async ({page}) => {
    await stubSaveFilePicker(page);
    await login(page, STAFF);
    await openDetails(page, artifact().adultClientInfos[0]!);
    await page.locator("title=facility_user.client.csv_export_label").first().click();
    await expect(page.getByText("csv_export.success")).toBeVisible();
    const csv = (await savedFile(page)).bytes.toString("utf8").replace(/\r\n/g, "\n");
    const from = csv.indexOf('"E2E flag"');
    const to = csv.indexOf("\n", csv.indexOf('"E2E legacy"'));
    expect(from).toBeGreaterThan(0);
    const lines = csv.slice(from, to).replace(MOMENT, "<moment>");
    // In the order of the attributes, with no line for a separator.
    expect(lines).toBe(
      [
        '"E2E flag",bool_values.yes',
        '"E2E day",29.02.2024',
        '"E2E moment","<moment>"',
        '"E2E count",42',
        '"E2E label",Alpha',
        '"E2E story","Line one\nLine two"',
        '"E2E size",Medium',
        '"E2E tags","red tape\nblue"',
        '"E2E numbers","3\n1\n2"',
        '"E2E days","2024-01-05\n2023-12-24"',
        '"E2E sizes","Large\nSmall"',
        '"E2E legacy","Old value"',
      ].join("\n"),
    );
  });

  test("an attribute referring to a user has no control and shows no value", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, adultClientInfos, filledClientId, staffUserId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    // Such an attribute is made through the API only: the attributes page does not offer the type.
    await adminApi.post(
      `facility/${facilityId}/admin/attribute`,
      attributeToCreate("e2eKeeper", "users", {name: "+E2E keeper", requirementLevel: "recommended"}),
    );
    await adminApi.patch(`${clientsPath()}/${filledClientId}`, {client: {e2eKeeper: staffUserId}});
    await clearMoment(adminApi);
    await login(page, STAFF);
    const form = await openDetails(page, adultClientInfos[0]!);
    await expect(attributeRow(form, "e2eKeeper")).toContainText("E2E keeper");
    await expect(attributeValue(form, "e2eKeeper")).toHaveText("");
    await editButton(form).click();
    await expect(formField(form, "client.e2eLabel")).toBeEnabled();
    await expect(attributeRow(form, "e2eKeeper").locator("input, textarea, [role=combobox]")).toHaveCount(0);
    // The rest of the form works, and the value stays.
    await formField(form, "client.e2eLabel").fill("Kept");
    await submitButton(page, "client_edit").click();
    await expectFormSuccess(page, "client_edit");
    expect(await clientAttributes(adminApi, facilityId, filledClientId)).toMatchObject({
      e2eLabel: "Kept",
      e2eKeeper: staffUserId,
    });
  });

  test("the position form has a control for each type of position attribute", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, sizeDictId, sizeIds} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    for (const [apiName, type] of [
      ["e2ePosFlag", "bool"],
      ["e2ePosCount", "int"],
      ["e2ePosDay", "date"],
      ["e2ePosNote", "text"],
      ["e2ePosSize", "dict"],
    ] as const) {
      await adminApi.post(
        `facility/${facilityId}/admin/attribute`,
        attributeToCreate(apiName, type, {model: "position", dictionaryId: type === "dict" ? sizeDictId : null}),
      );
    }
    await openPage(page, `/${FACILITY.url}/admin/technicals/dictionaries/${sizeDictId}`, ADMIN);
    await tableRows(page.locator("main"), "Small").locator("title=actions.edit").click();
    await expect(page.getByRole("heading", {name: /forms\.position_edit\.form_name/})).toBeVisible();
    const form = page.locator("#position_edit");
    await expect(attributeRow(form, "e2ePosCount").locator('input[type="number"]')).toBeVisible();
    await expect(attributeRow(form, "e2ePosDay").locator('input[type="date"]')).toBeVisible();
    await formField(form, "position.e2ePosFlag").check();
    await formField(form, "position.e2ePosCount").fill("36");
    await formField(form, "position.e2ePosDay").fill("2024-02-29");
    await form.locator('textarea[name="position.e2ePosNote"]').fill("Runs\nsmall");
    await chooseInFormSelect(page, "position.e2ePosSize", "Large");
    await submitButton(page, "position_edit").click();
    await expectFormSuccess(page, "position_edit");
    const [dictionary] = await adminApi.list<{positions: readonly Record<string, unknown>[]}>(
      "system/dictionary",
      sizeDictId,
    );
    expect(dictionary!.positions.find(({id}) => id === sizeIds.small)).toMatchObject({
      e2ePosFlag: true,
      e2ePosCount: 36,
      e2ePosDay: "2024-02-29",
      e2ePosNote: "Runs\nsmall",
      e2ePosSize: sizeIds.large,
    });
  });

  test(
    "a client keeps the values whose dictionary positions were disabled since, through an edit",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, sizeIds, adultClientInfos, filledClientId} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const staffApi = await api.loggedInAs(STAFF);
      await clearMoment(staffApi);
      // The filled client has "Medium" as the size, and "Large" and "Small" as the sizes.
      for (const positionId of [sizeIds.medium, sizeIds.large]) {
        await adminApi.patch(`facility/${facilityId}/admin/position/${positionId}`, {isDisabled: true});
      }
      await login(page, STAFF);
      const form = await openDetails(page, adultClientInfos[0]!);
      // The details still show the values.
      await expect(attributeValue(form, "e2eSize")).toHaveText("Medium");
      await expect(attributeValue(form, "e2eSizes")).toHaveText("Large, Small");
      await editButton(form).click();
      // The form has lost them: the selects leave the disabled positions out.
      await expect(formSelect(form, "client.e2eSize")).toHaveText("");
      await expect(formSelect(form, "client.e2eSizes")).toHaveText("Small");
      await formField(form, "client.e2eCount").fill("43");
      await submitButton(page, "client_edit").click();
      // The required one has to be given anew for anything to be saved.
      await expectFormErrors(form, {"client.e2eSize": "required"});
      await chooseInFormSelect(page, "client.e2eSize", "Small");
      await submitButton(page, "client_edit").click();
      await expectFormSuccess(page, "client_edit");
      test.fail(
        true,
        "The selects of the dictionary attributes leave the disabled positions out, also those the client has: " +
          "a save of any other change takes them off the client.",
      );
      expect((await e2eValues(staffApi, filledClientId)).e2eSizes).toEqual([sizeIds.large, sizeIds.small]);
    },
  );

  test("a client with a time value is saved in the edit form", {tag: "@ui"}, async ({page}) => {
    await login(page, STAFF);
    const form = await openDetails(page, artifact().adultClientInfos[0]!);
    await editButton(form).click();
    await formField(form, "client.e2eLabel").fill("Saved");
    await submitButton(page, "client_edit").click();
    await expectFormErrors(form, {"client.e2eMoment": "date_format"});
    test.fail(
      true,
      "The form sends the time back with the microseconds it got it with, and the server takes whole seconds only: " +
        "an error at a field the form has no control for.",
    );
    await expectFormSuccess(page, "client_edit");
  });

  test("the client form opens in a facility with a list-of-booleans attribute", {tag: "@ui"}, async ({page, api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    await adminApi.post(
      `facility/${artifact().facilityId}/admin/attribute`,
      attributeToCreate("e2eFlags", "bool", {isMultiValue: true}),
    );
    // The app logs the error it caught; a browser may give the text of the log entry as "Error"
    // alone, so the message is read from the logged object.
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        for (const arg of message.args()) {
          void arg
            .evaluate((value) => (value instanceof Error ? value.message : String(value)))
            .then((text) => errors.push(text))
            .catch(() => undefined);
        }
      }
    });
    await login(page, STAFF);
    await page.goto(`/${FACILITY.url}/clients/create`);
    await expect.poll(() => errors.join("\n")).toContain("Unsupported multiple attribute of type bool");
    test.fail(
      true,
      "The attribute form lets any type be multi-value, but the client form throws on this one, " +
        "and the page is left blank.",
    );
    await expect(formField(page.locator("#client_create"), "name")).toBeVisible();
  });
});
