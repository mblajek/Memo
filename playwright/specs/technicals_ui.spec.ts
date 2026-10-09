import {loadConfig} from "../lib/config.ts";
import {ADMIN, FACILITY, STAFF} from "../lib/layers/facility.ts";
import {
  COLOUR_DICT_NAME,
  COLOURS_ATTR,
  NICKNAME_ATTR,
  OTHER_DICT_NAME,
  TAGGED_CLIENT_NICKNAME,
  technicalsLayer,
} from "../lib/layers/technicals.ts";
import {createdId} from "../lib/responses.ts";
import {
  attributeRow,
  chooseInFormSelect,
  columnChooserBox,
  expectFormSuccess,
  expectSectionShown,
  formField,
  formSelect,
  submitButton,
  tableRows,
} from "../helpers/selectors.ts";
import {expect, login, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";
import {attributeToCreate, clientAttributes} from "../helpers/queries.ts";

/**
 * UI tests of the facility admin's technicals pages (dictionaries, positions, attributes), and of
 * the custom attributes on the client form. Literal names are stored with a "+" prefix and
 * displayed without it.
 */

const TECHNICALS = `/${FACILITY.url}/admin/technicals`;

interface Dictionary {
  readonly id: string;
  readonly name: string;
  readonly facilityId: string | null;
  readonly isExtendable: boolean;
  readonly positions: readonly {readonly id: string; readonly name: string; readonly isDisabled: boolean}[];
}

async function dictionaries(api: MemoAPI) {
  return await api.getData<readonly Dictionary[]>("system/dictionary/list");
}

async function positionNames(api: MemoAPI, dictionaryId: string) {
  return (await dictionaries(api)).find((d) => d.id === dictionaryId)!.positions.map((p) => p.name);
}

interface Attribute {
  readonly id: string;
  readonly name: string;
  readonly apiName: string;
  readonly facilityId: string | null;
  readonly model: string;
  readonly type: string;
  readonly isMultiValue: boolean | null;
  readonly dictionaryId: string | null;
  readonly requirementLevel: string;
  readonly defaultOrder: number;
}

async function attributes(api: MemoAPI) {
  return await api.getData<readonly Attribute[]>("system/attribute/list");
}

technicalsLayer.describe((artifact) => {
  readOnlyTest("dictionaries page lists the facility's and the global dictionaries", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `${TECHNICALS}/dictionaries`, ADMIN);
    const main = page.locator("main");
    await expect(main.getByRole("link", {name: "E2E Colours"})).toBeVisible();
    await expect(main.getByRole("link", {name: "E2E Empty"})).toBeVisible();
    await expect(main.getByRole("link", {name: "dictionary.gender._name"})).toBeVisible();
    await expect(main.getByText("E2E Other Facility Dict")).toHaveCount(0);
    // Only the facility's own dictionaries can be edited or deleted here.
    const ownRow = tableRows(main, "E2E Colours");
    await expect(ownRow).toContainText(FACILITY.name);
    await expect(ownRow.locator("title=actions.edit")).toBeVisible();
    await expect(ownRow.locator("title=actions.delete")).toBeVisible();
    const globalRow = tableRows(main, "dictionary.gender._name");
    await expect(globalRow).toHaveCount(1);
    await expect(globalRow.locator("title=actions.edit")).toHaveCount(0);
    await expect(globalRow.locator("title=actions.delete")).toHaveCount(0);
  });

  readOnlyTest("technicals pages are for facility admins only", {tag: "@ui"}, async ({page}) => {
    await login(page, STAFF);
    for (const path of ["attributes", "dictionaries", `dictionaries/${artifact().colourDictId}`]) {
      await openPage(page, `${TECHNICALS}/${path}`);
      await expect(page.getByText("no_permissions_to_view")).toBeVisible();
      await expect(page.getByText("E2E Colours")).toHaveCount(0);
    }
    await expect(
      page.locator("nav").getByText(/routes\.facility\.facility_admin\.(technicals|dictionaries)/),
    ).toHaveCount(0);
  });

  readOnlyTest("global admin's technicals pages list the rows of all the facilities", {tag: "@ui"}, async ({page}) => {
    const cfg = await loadConfig();
    await openPage(page, "/admin/technicals/dictionaries", cfg.ui.admin);
    const main = page.locator("main");
    // The lists are paged; each is narrowed down to the rows looked at.
    const search = main.getByRole("textbox", {name: "actions.search"});
    await search.fill("E2E");
    await expect(main.getByRole("link", {name: "E2E Colours"})).toBeVisible();
    await expect(main.getByRole("link", {name: "E2E Other Facility Dict"})).toBeVisible();
    await expect(tableRows(main, "E2E Other Facility Dict").locator("title=actions.edit")).toBeVisible();
    // Fixed dictionaries stay read-only.
    await search.fill("gender");
    const fixedRow = tableRows(main, "dictionary.gender._name");
    await expect(fixedRow).toHaveCount(1);
    await expect(fixedRow.locator("title=actions.edit")).toHaveCount(0);
    await openPage(page, "/admin/technicals/attributes");
    await search.fill("E2E nickname");
    await expect(tableRows(main, "E2E nickname").locator("title=actions.edit")).toBeVisible();
  });

  test(
    "an attribute and a dictionary of another facility are not on this facility's pages",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {otherFacilityId} = artifact();
      const foreign = {...attributeToCreate("e2eForeign", "string"), facilityId: otherFacilityId};
      await globalAdminApi.post("admin/attribute", foreign);
      const main = page.locator("main");

      await test.step("the client form", async () => {
        await openPage(page, `/${FACILITY.url}/clients/create`, ADMIN);
        const form = page.locator("form#client_create");
        await expect(attributeRow(form, NICKNAME_ATTR.apiName)).toBeVisible();
        await expect(attributeRow(form, foreign.apiName)).toHaveCount(0);
        await expect(form.getByText(foreign.name.slice(1))).toHaveCount(0);
      });

      await test.step("the columns of the clients table", async () => {
        await openPage(page, `/${FACILITY.url}/clients`);
        await main.getByRole("button", {name: "tables.choose_columns"}).click();
        await expect(columnChooserBox(page, "client", `client.${NICKNAME_ATTR.apiName}`)).toBeVisible();
        await expect(columnChooserBox(page, "client", `client.${foreign.apiName}`)).toHaveCount(0);
      });

      await test.step("the technicals pages of the facility admin", async () => {
        await openPage(page, `${TECHNICALS}/attributes`);
        await expect(tableRows(main, NICKNAME_ATTR.name.slice(1))).toHaveCount(1);
        await expect(main.getByText(foreign.name.slice(1))).toHaveCount(0);
        // The dictionary select of the attribute form offers the facility's dictionaries only.
        await page.getByRole("button", {name: /actions\.attribute\.add/}).click();
        const form = page.locator("form#attribute_create");
        await chooseInFormSelect(page, "type", /^dict$/);
        await formSelect(form, "dictionaryId").click();
        await expect(page.getByRole("option", {name: COLOUR_DICT_NAME.slice(1)})).toBeVisible();
        await expect(page.getByRole("option", {name: OTHER_DICT_NAME.slice(1)})).toHaveCount(0);
      });
    },
  );

  test(
    "facility admin creates a dictionary and its first position via the forms",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId} = artifact();
      await openPage(page, `${TECHNICALS}/dictionaries`, ADMIN);
      await page.getByRole("button", {name: /actions\.dictionary\.add/}).click();
      await expect(page.getByRole("heading", {name: /forms\.dictionary_create\.form_name/})).toBeVisible();
      await formField(page, "name").fill("UI Sizes");
      await submitButton(page, "dictionary_create").click();
      await expectFormSuccess(page, "dictionary_create");

      const adminApi = await api.loggedInAs(ADMIN);
      // The form adds the "+" marking a literal name.
      const created = (await dictionaries(adminApi)).find((d) => d.name === "+UI Sizes");
      expect(created).toMatchObject({facilityId, positions: []});

      await page.locator("main").getByRole("link", {name: "UI Sizes"}).click();
      await expect(page).toHaveURL(new RegExp(`/dictionaries/(\\./)?${created!.id}$`));
      await expect(page.locator("main").getByText("UI Sizes")).toBeVisible();
      await page.getByRole("button", {name: /actions\.position\.add/}).click();
      await expect(page.getByRole("heading", {name: /forms\.position_create\.form_name/})).toBeVisible();
      await formField(page, "name").fill("Large");
      await submitButton(page, "position_create").click();
      await expectFormSuccess(page, "position_create");
      await expect(tableRows(page.locator("main"), "Large")).toHaveCount(1);
      expect(await positionNames(adminApi, created!.id)).toEqual(["+Large"]);
    },
  );

  readOnlyTest("dictionary create form reports a taken name", {tag: "@ui"}, async ({page, api}) => {
    await openPage(page, `${TECHNICALS}/dictionaries`, ADMIN);
    await page.getByRole("button", {name: /actions\.dictionary\.add/}).click();
    await formField(page, "name").fill(COLOUR_DICT_NAME.slice(1));
    await submitButton(page, "dictionary_create").click();
    await expect(page.getByText(/validation\.unique/)).toBeVisible();
    await expect(page.getByRole("heading", {name: /forms\.dictionary_create\.form_name/})).toBeVisible();
    const adminApi = await api.loggedInAs(ADMIN);
    expect((await dictionaries(adminApi)).filter((d) => d.name === COLOUR_DICT_NAME)).toHaveLength(1);
  });

  test(
    "facility admin renames a dictionary and deletes an empty one; a used one is kept",
    {tag: "@ui"},
    async ({page, api}) => {
      const {colourDictId, emptyDictId} = artifact();
      await openPage(page, `${TECHNICALS}/dictionaries`, ADMIN);
      const main = page.locator("main");
      const adminApi = await api.loggedInAs(ADMIN);

      await test.step("rename", async () => {
        await tableRows(main, "E2E Colours").locator("title=actions.edit").click();
        await expect(page.getByRole("heading", {name: /forms\.dictionary_edit\.form_name/})).toBeVisible();
        const nameInput = formField(page, "name");
        await expect(nameInput).toHaveValue("E2E Colours");
        await nameInput.fill("E2E Colors");
        await submitButton(page, "dictionary_edit").click();
        await expectFormSuccess(page, "dictionary_edit");
        await expect(main.getByRole("link", {name: "E2E Colors"})).toBeVisible();
        expect((await dictionaries(adminApi)).find((d) => d.id === colourDictId)!.name).toBe("+E2E Colors");
      });

      await test.step("delete of a dictionary with positions is refused", async () => {
        await tableRows(main, "E2E Colors").locator("title=actions.delete").click();
        await expect(page.getByText(/forms\.dictionary_delete\.confirmation_text/)).toBeVisible();
        await page.getByRole("button", {name: /^actions\.delete$/}).click();
        await expect(page.getByText(/validation\.in_use/)).toBeVisible();
        expect((await dictionaries(adminApi)).some((d) => d.id === colourDictId)).toBe(true);
      });

      await test.step("delete of an empty dictionary", async () => {
        await tableRows(main, "E2E Empty").locator("title=actions.delete").click();
        await expect(page.getByText(/forms\.dictionary_delete\.confirmation_text/)).toBeVisible();
        await page.getByRole("button", {name: /^actions\.delete$/}).click();
        await expectFormSuccess(page, "dictionary_delete");
        await expect(main.getByRole("link", {name: "E2E Empty"})).toHaveCount(0);
        expect((await dictionaries(adminApi)).some((d) => d.id === emptyDictId)).toBe(false);
      });
    },
  );

  test(
    "facility admin edits, inserts and deletes positions on the dictionary page",
    {tag: "@ui"},
    async ({page, api}) => {
      const {colourDictId, colourIds} = artifact();
      await openPage(page, `${TECHNICALS}/dictionaries/${colourDictId}`, ADMIN);
      const main = page.locator("main");
      const adminApi = await api.loggedInAs(ADMIN);
      await expect(tableRows(main, /Red|Green|Blue/)).toHaveText([/Red/, /Green/, /Blue/]);

      await test.step("rename and disable", async () => {
        await tableRows(main, "Green").locator("title=actions.edit").click();
        await expect(page.getByRole("heading", {name: /forms\.position_edit\.form_name/})).toBeVisible();
        const nameInput = formField(page, "name");
        await expect(nameInput).toHaveValue("Green");
        await nameInput.fill("Lime");
        await formField(page, "isDisabled").check();
        await submitButton(page, "position_edit").click();
        await expectFormSuccess(page, "position_edit");
        await expect(tableRows(main, "Lime")).toHaveCount(1);
        const {positions} = (await dictionaries(adminApi)).find((d) => d.id === colourDictId)!;
        expect(positions.find((p) => p.id === colourIds.green)).toMatchObject({name: "+Lime", isDisabled: true});
      });

      await test.step("create, inserted before an existing position", async () => {
        await page.getByRole("button", {name: /actions\.position\.add/}).click();
        await formField(page, "name").fill("Amber");
        await chooseInFormSelect(page, "defaultOrder", /Lime/);
        await submitButton(page, "position_create").click();
        await expectFormSuccess(page, "position_create");
        await expect(tableRows(main, /Red|Amber|Lime|Blue/)).toHaveText([/Red/, /Amber/, /Lime/, /Blue/]);
        expect(await positionNames(adminApi, colourDictId)).toEqual(["+Red", "+Amber", "+Lime", "+Blue"]);
      });

      await test.step("delete of a position in use is refused", async () => {
        await tableRows(main, "Red").locator("title=actions.delete").click();
        await expect(page.getByText(/forms\.position_delete\.confirmation_text/)).toBeVisible();
        await page.getByRole("button", {name: /^actions\.delete$/}).click();
        await expect(page.getByText(/validation\.in_use/)).toBeVisible();
      });

      await test.step("delete of an unused position", async () => {
        await tableRows(main, "Blue").locator("title=actions.delete").click();
        await expect(page.getByText(/forms\.position_delete\.confirmation_text/)).toBeVisible();
        await page.getByRole("button", {name: /^actions\.delete$/}).click();
        await expectFormSuccess(page, "position_delete");
        await expect(tableRows(main, "Blue")).toHaveCount(0);
        expect(await positionNames(adminApi, colourDictId)).toEqual(["+Red", "+Amber", "+Lime"]);
      });
    },
  );

  test("facility admin reorders positions by dragging in the reorder dialog", {tag: "@ui"}, async ({page, api}) => {
    const {colourDictId, colourIds} = artifact();
    await openPage(page, `${TECHNICALS}/dictionaries/${colourDictId}`, ADMIN);
    const main = page.locator("main");
    await expect(tableRows(main, /Red|Green|Blue/)).toHaveText([/Red/, /Green/, /Blue/]);
    await main.getByRole("button", {name: /actions\.reorder/}).click();
    await expect(page.getByRole("heading", {name: /forms\.position_reorder\.form_name/})).toBeVisible();
    const items = page.locator("[data-order-item]");
    await expect(items).toHaveText([/Red/, /Green/, /Blue/]);
    const save = page.getByRole("button", {name: /^actions\.save$/});
    await expect(save).toBeDisabled();
    await page
      .locator(`[data-order-item="${colourIds.blue}"]`)
      .dragTo(page.locator(`[data-order-item="${colourIds.red}"]`));
    await expect(items).toHaveText([/Blue/, /Red/, /Green/]);
    await save.click();
    await expectFormSuccess(page, "position_reorder");
    await expect(tableRows(main, /Red|Green|Blue/)).toHaveText([/Blue/, /Red/, /Green/]);
    const adminApi = await api.loggedInAs(ADMIN);
    expect(await positionNames(adminApi, colourDictId)).toEqual(["+Blue", "+Red", "+Green"]);
  });

  test(
    "facility admin creates an attribute via the form; it appears on the client form",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, taggedClientId} = artifact();
      await openPage(page, `${TECHNICALS}/attributes`, ADMIN);
      const main = page.locator("main");
      await expect(tableRows(main, "E2E nickname")).toContainText(FACILITY.name);
      await page.getByRole("button", {name: /actions\.attribute\.add/}).click();
      await expect(page.getByRole("heading", {name: /forms\.attribute_create\.form_name/})).toBeVisible();
      // The model and type default to a string attribute of clients.
      await expect(formSelect(page, "model")).toContainText("client");
      await expect(formSelect(page, "type")).toContainText("string");
      // The api name, hidden outside of the advanced view, is the name with a random suffix.
      await formField(page, "name").fill("UI hobby");
      await submitButton(page, "attribute_create").click();
      await expectFormSuccess(page, "attribute_create");
      await expect(tableRows(main, "UI hobby")).toHaveCount(1);

      const adminApi = await api.loggedInAs(ADMIN);
      const created = (await attributes(adminApi)).find((a) => a.name === "+UI hobby");
      expect(created).toMatchObject({
        apiName: expect.stringMatching(/^uiHobbyU[0-9a-f]{8}$/),
        facilityId,
        model: "client",
        type: "string",
        isMultiValue: false,
      });

      await openPage(page, `/${FACILITY.url}/clients/${taggedClientId}`);
      await page
        .getByRole("button", {name: /actions\.edit/})
        .first()
        .click();
      const hobby = page.locator(`input[name="client.${created!.apiName}"]`);
      await expect(hobby).toBeEnabled();
      await hobby.fill("Chess");
      await submitButton(page, "client_edit").click();
      await expectFormSuccess(page, "client_edit");
      expect(await clientAttributes(adminApi, facilityId, taggedClientId)).toMatchObject({[created!.apiName]: "Chess"});
    },
  );

  test(
    "facility admin creates a multi-value dictionary attribute at a chosen place in the order",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, colourDictId, coloursAttrId, nicknameAttrId, unusedAttrId} = artifact();
      await openPage(page, `${TECHNICALS}/attributes`, ADMIN);
      await page.getByRole("button", {name: /actions\.attribute\.add/}).click();
      await expect(page.getByRole("heading", {name: /forms\.attribute_create\.form_name/})).toBeVisible();
      await formField(page, "name").fill("UI shades");
      await chooseInFormSelect(page, "type", /^dict$/);
      await chooseInFormSelect(page, "dictionaryId", COLOUR_DICT_NAME);
      await formField(page, "isMultiValue").check();
      await chooseInFormSelect(page, "requirementLevel", /^recommended$/);
      await chooseInFormSelect(page, "defaultOrder", /E2E nickname/);
      await submitButton(page, "attribute_create").click();
      await expectFormSuccess(page, "attribute_create");

      const adminApi = await api.loggedInAs(ADMIN);
      const facilityAttributes = (await attributes(adminApi))
        .filter((a) => a.facilityId === facilityId)
        .toSorted((a, b) => a.defaultOrder - b.defaultOrder);
      const created = facilityAttributes.find((a) => a.name === "+UI shades");
      expect(created).toMatchObject({
        model: "client",
        type: "dict",
        dictionaryId: colourDictId,
        isMultiValue: true,
        requirementLevel: "recommended",
      });
      expect(facilityAttributes.map((a) => a.id)).toEqual([coloursAttrId, created!.id, nicknameAttrId, unusedAttrId]);
    },
  );

  test("facility admin reorders attributes by dragging in the reorder dialog", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, coloursAttrId, nicknameAttrId, unusedAttrId} = artifact();
    await openPage(page, `${TECHNICALS}/attributes`, ADMIN);
    await tableRows(page.locator("main"), "E2E unused").locator("title=actions.reorder").click();
    await expect(page.getByRole("heading", {name: /forms\.attribute_reorder\.form_name/})).toBeVisible();
    // The dialog lists all the client attributes; the global ones take up places but cannot move.
    const items = page.locator("[data-order-item]");
    await expect(items.last()).toContainText("E2E unused");
    await expect(page.locator("[data-order-item][draggable=true]")).toHaveText([
      /E2E colours/,
      /E2E nickname/,
      /E2E unused/,
    ]);
    await page
      .locator(`[data-order-item="${unusedAttrId}"]`)
      .dragTo(page.locator(`[data-order-item="${coloursAttrId}"]`));
    await expect(page.locator("[data-order-item][draggable=true]")).toHaveText([
      /E2E unused/,
      /E2E colours/,
      /E2E nickname/,
    ]);
    await page.getByRole("button", {name: /^actions\.save$/}).click();
    await expectFormSuccess(page, "attribute_reorder");

    const adminApi = await api.loggedInAs(ADMIN);
    const facilityAttributeIds = (await attributes(adminApi))
      .filter((a) => a.facilityId === facilityId)
      .toSorted((a, b) => a.defaultOrder - b.defaultOrder)
      .map((a) => a.id);
    expect(facilityAttributeIds).toEqual([unusedAttrId, coloursAttrId, nicknameAttrId]);
  });

  test(
    "facility admin renames an attribute and deletes an unused one; a used one is kept",
    {tag: "@ui"},
    async ({page, api}) => {
      const {nicknameAttrId, unusedAttrId} = artifact();
      await openPage(page, `${TECHNICALS}/attributes`, ADMIN);
      const main = page.locator("main");
      const adminApi = await api.loggedInAs(ADMIN);

      await test.step("rename", async () => {
        await tableRows(main, "E2E unused").locator("title=actions.edit").click();
        await expect(page.getByRole("heading", {name: /forms\.attribute_edit\.form_name/})).toBeVisible();
        const nameInput = formField(page, "name");
        await expect(nameInput).toHaveValue("E2E unused");
        await nameInput.fill("E2E spare");
        await submitButton(page, "attribute_edit").click();
        await expectFormSuccess(page, "attribute_edit");
        await expect(tableRows(main, "E2E spare")).toHaveCount(1);
        expect((await attributes(adminApi)).find((a) => a.id === unusedAttrId)!.name).toBe("+E2E spare");
      });

      await test.step("delete of an attribute with values is refused", async () => {
        await tableRows(main, "E2E nickname").locator("title=actions.delete").click();
        await expect(page.getByText(/forms\.attribute_delete\.confirmation_text/)).toBeVisible();
        await page.getByRole("button", {name: /^actions\.delete$/}).click();
        await expect(page.getByText(/validation\.in_use/)).toBeVisible();
        expect((await attributes(adminApi)).some((a) => a.id === nicknameAttrId)).toBe(true);
      });

      await test.step("delete of an unused attribute", async () => {
        await tableRows(main, "E2E spare").locator("title=actions.delete").click();
        await expect(page.getByText(/forms\.attribute_delete\.confirmation_text/)).toBeVisible();
        await page.getByRole("button", {name: /^actions\.delete$/}).click();
        await expectFormSuccess(page, "attribute_delete");
        await expect(tableRows(main, "E2E spare")).toHaveCount(0);
        expect((await attributes(adminApi)).some((a) => a.id === unusedAttrId)).toBe(false);
      });
    },
  );

  test(
    "the description and the metadata of an attribute take effect in the client form",
    {tag: "@ui"},
    async ({page, api}) => {
      await openPage(page, `${TECHNICALS}/attributes`, ADMIN);
      const main = page.locator("main");
      const adminApi = await api.loggedInAs(ADMIN);
      const addAttribute = async (name: string, fillIn: () => Promise<void>) => {
        await page.getByRole("button", {name: /actions\.attribute\.add/}).click();
        const heading = page.getByRole("heading", {name: /forms\.attribute_create\.form_name/});
        await expect(heading).toBeVisible();
        await page.getByRole("checkbox", {name: "forms.generic.advanced_view"}).check();
        await formField(page, "name").fill(name);
        await fillIn();
        await submitButton(page, "attribute_create").click();
        await expect(heading).toHaveCount(0);
        await expect(tableRows(main, name)).toHaveCount(1);
      };

      // A separator that starts folded, and after it an attribute that is therefore in its group.
      await addAttribute("UI folded group", async () => {
        await chooseInFormSelect(page, "type", /^separator$/);
        // A separator has no requirement level.
        await expectSectionShown(formSelect(page, "requirementLevel"), false);
        await formField(page, "metadata").fill('{"groupFolding": {"enabled": true, "initialFolded": true}}');
      });
      await addAttribute("UI explained", async () => {
        await formField(page, "apiName").fill("uiExplained");
        await page.locator('textarea[name="description"]').fill("What to put here");
        await formField(page, "metadata").fill('{"isMultiLine": true}');
      });
      const created = (name: string) => attributes(adminApi).then((all) => all.find((a) => a.name === `+${name}`));
      expect(await created("UI folded group")).toMatchObject({
        type: "separator",
        description: null,
        metadata: {groupFolding: {enabled: true, initialFolded: true}},
      });
      expect(await created("UI explained")).toMatchObject({
        type: "string",
        description: "What to put here",
        metadata: {isMultiLine: true},
      });

      await test.step("the client form: the group unfolds, the field has several lines and an explanation", async () => {
        await openPage(page, `/${FACILITY.url}/clients/create`);
        const form = page.locator("#client_create");
        const row = attributeRow(form, "uiExplained");
        await expect(form.getByText("UI folded group")).toBeVisible();
        await expectSectionShown(form.getByText("UI folded group"), true);
        await expectSectionShown(row, false);
        await form.locator("title=actions.expand").click();
        await expectSectionShown(row, true);
        await expect(row.locator('textarea[name="client.uiExplained"]')).toBeVisible();
        await expect(row.locator('[aria-description="What to put here"]')).toBeVisible();
        await form.locator("title=actions.collapse").click();
        await expectSectionShown(row, false);
      });

      await test.step("the description and the metadata are cleared in the edit form", async () => {
        await openPage(page, `${TECHNICALS}/attributes`);
        await tableRows(main, "UI explained").locator("title=actions.edit").click();
        await expect(page.locator('textarea[name="description"]')).toHaveValue("What to put here");
        await expect(formField(page, "metadata")).toHaveValue('{"isMultiLine":true}');
        await page.locator('textarea[name="description"]').fill("");
        await formField(page, "metadata").fill("");
        await submitButton(page, "attribute_edit").click();
        await expectFormSuccess(page, "attribute_edit");
        expect(await created("UI explained")).toMatchObject({description: null, metadata: null});
      });
    },
  );

  test(
    "advanced view shows the api name and the metadata of an attribute, in every technicals form",
    {tag: "@ui"},
    async ({page, api}) => {
      await openPage(page, `${TECHNICALS}/attributes`, ADMIN);
      await page.getByRole("button", {name: /actions\.attribute\.add/}).click();
      const apiName = formField(page, "apiName");
      const metadata = formField(page, "metadata");
      await expectSectionShown(apiName, false);
      await expectSectionShown(metadata, false);
      const advancedView = page.getByRole("checkbox", {name: "forms.generic.advanced_view"});
      await advancedView.check();
      await expectSectionShown(apiName, true);
      await expectSectionShown(metadata, true);

      // The api name follows the name until it is edited by hand.
      await formField(page, "name").fill("UI badge");
      await expect(apiName).toHaveValue(/^uiBadgeU[0-9a-f]{8}$/);
      await apiName.fill("uiBadgeCustom");
      await formField(page, "name").fill("UI badge two");
      await expect(apiName).toHaveValue("uiBadgeCustom");
      await submitButton(page, "attribute_create").click();
      await expectFormSuccess(page, "attribute_create");
      const adminApi = await api.loggedInAs(ADMIN);
      expect((await attributes(adminApi)).find((a) => a.name === "+UI badge two")).toMatchObject({
        apiName: "uiBadgeCustom",
      });

      // The choice is kept for the other forms: the dictionary form has the required attributes.
      await openPage(page, `${TECHNICALS}/dictionaries`);
      await page.getByRole("button", {name: /actions\.dictionary\.add/}).click();
      const requiredAttributes = formSelect(page, "positionRequiredAttributeIds");
      await expect(page.getByRole("checkbox", {name: "forms.generic.advanced_view"})).toBeChecked();
      await expectSectionShown(requiredAttributes, true);
      await page.getByRole("checkbox", {name: "forms.generic.advanced_view"}).uncheck();
      await expectSectionShown(requiredAttributes, false);
    },
  );

  test(
    "a position attribute is filled in on the position form, and then required by the dictionary",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, colourDictId, colourIds} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const adminPath = `facility/${facilityId}/admin`;
      const hexAttrId = await createdId(
        await adminApi.post(`${adminPath}/attribute`, {
          model: "position",
          name: "+UI hex",
          apiName: "uiHex",
          type: "string",
          dictionaryId: null,
          isMultiValue: false,
          requirementLevel: "optional",
          description: null,
        }),
      );
      for (const id of [colourIds.red, colourIds.green]) {
        await adminApi.patch(`${adminPath}/position/${id}`, {uiHex: "#abc"});
      }
      const positionValues = async () =>
        Object.fromEntries(
          (
            (await (await adminApi.get(`system/dictionary/list?in=${colourDictId}`)).json()) as {
              data: [{positions: {name: string; uiHex?: string | null}[]}];
            }
          ).data[0].positions.map(({name, uiHex}) => [name, uiHex ?? null]),
        );
      const requiredAttributeIds = async () =>
        (
          (await (await adminApi.get(`system/dictionary/list?in=${colourDictId}`)).json()) as {
            data: [{positionRequiredAttributeIds?: string[] | null}];
          }
        ).data[0].positionRequiredAttributeIds ?? [];

      await openPage(page, `${TECHNICALS}/dictionaries/${colourDictId}`, ADMIN);
      const main = page.locator("main");

      await test.step("the attribute of a position is edited in its form", async () => {
        await tableRows(main, "Blue").locator("title=actions.edit").click();
        await expect(page.getByRole("heading", {name: /forms\.position_edit\.form_name/})).toBeVisible();
        await formField(page, "position.uiHex").fill("#00f");
        await submitButton(page, "position_edit").click();
        await expectFormSuccess(page, "position_edit");
        expect(await positionValues()).toEqual({"+Red": "#abc", "+Green": "#abc", "+Blue": "#00f"});
      });

      await test.step("the dictionary requires the attribute, in the advanced view of its form", async () => {
        await openPage(page, `${TECHNICALS}/dictionaries`);
        await tableRows(main, "E2E Colours").locator("title=actions.edit").click();
        await expect(page.getByRole("heading", {name: /forms\.dictionary_edit\.form_name/})).toBeVisible();
        await page.getByRole("checkbox", {name: "forms.generic.advanced_view"}).check();
        await formSelect(page, "positionRequiredAttributeIds").click();
        await page.getByRole("option", {name: "UI hex"}).click();
        // Close the list of options (Escape would close the form too).
        await page.getByRole("heading", {name: /forms\.dictionary_edit\.form_name/}).click();
        await submitButton(page, "dictionary_edit").click();
        await expectFormSuccess(page, "dictionary_edit");
        expect(await requiredAttributeIds()).toEqual([hexAttrId]);
      });

      await test.step("a new position cannot be saved without the value", async () => {
        await openPage(page, `${TECHNICALS}/dictionaries/${colourDictId}`);
        await page.getByRole("button", {name: /actions\.position\.add/}).click();
        await formField(page, "name").fill("Yellow");
        await submitButton(page, "position_create").click();
        await expect(page.getByText("validation.required")).toBeVisible();
        await formField(page, "position.uiHex").fill("#ff0");
        await submitButton(page, "position_create").click();
        await expectFormSuccess(page, "position_create");
        expect(await positionValues()).toMatchObject({"+Yellow": "#ff0"});
      });
    },
  );

  test(
    "global admin creates a global dictionary and one of a facility, with the forms always advanced",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId} = artifact();
      const cfg = await loadConfig();
      await openPage(page, "/admin/technicals/dictionaries", cfg.ui.admin);
      const main = page.locator("main");
      const isExtendable = formField(page, "isExtendable");

      await test.step("a global one, not extendable", async () => {
        await page.getByRole("button", {name: /actions\.dictionary\.add/}).click();
        await expect(page.getByRole("heading", {name: /forms\.dictionary_create\.form_name/})).toBeVisible();
        // No switch: the fields of the advanced view are there from the start.
        await expect(page.getByRole("checkbox", {name: "forms.generic.advanced_view"})).toHaveCount(0);
        await expectSectionShown(formSelect(page, "positionRequiredAttributeIds"), true);
        // No facility is chosen: the dictionary is to be a global one, and those may be not extendable.
        await expectSectionShown(isExtendable, true);
        await expect(isExtendable).toBeChecked();
        await isExtendable.uncheck();
        await formField(page, "name").fill("UI Global");
        await submitButton(page, "dictionary_create").click();
        await expectFormSuccess(page, "dictionary_create");
      });

      await test.step("one of a facility, which is always extendable", async () => {
        await page.getByRole("button", {name: /actions\.dictionary\.add/}).click();
        await chooseInFormSelect(page, "facilityId", FACILITY.name);
        await expectSectionShown(isExtendable, false);
        await formField(page, "name").fill("UI Of Facility");
        await submitButton(page, "dictionary_create").click();
        await expect(page.getByText("forms.dictionary_create.success").last()).toBeVisible();
        // The list is paged; narrowed down to the dictionary looked at.
        await main.getByRole("textbox", {name: "actions.search"}).fill("UI Of Facility");
        await expect(main.getByRole("link", {name: "UI Of Facility"})).toBeVisible();
      });

      const listed = await dictionaries(await api.loggedInAs(ADMIN));
      expect(listed.find((d) => d.name === "+UI Global")).toMatchObject({facilityId: null, isExtendable: false});
      expect(listed.find((d) => d.name === "+UI Of Facility")).toMatchObject({facilityId, isExtendable: true});

      await test.step("the facility of a dictionary cannot be changed; the extendability of a global one can", async () => {
        await main.getByRole("textbox", {name: "actions.search"}).fill("UI Global");
        await tableRows(main, "UI Global").locator("title=actions.edit").click();
        await expect(page.getByRole("heading", {name: /forms\.dictionary_edit\.form_name/})).toBeVisible();
        // A disabled select is inert.
        await expect(formSelect(page, "facilityId")).toHaveAttribute("inert");
        await isExtendable.check();
        await submitButton(page, "dictionary_edit").click();
        await expectFormSuccess(page, "dictionary_edit");
        expect((await dictionaries(await api.loggedInAs(ADMIN))).find((d) => d.name === "+UI Global")).toMatchObject({
          isExtendable: true,
        });
      });
    },
  );

  test(
    "global admin adds a global position and one of a facility to a global dictionary",
    {tag: "@ui"},
    async ({page, api, globalAdminApi}) => {
      const {facilityId} = artifact();
      const dictId = await createdId(
        await globalAdminApi.post("admin/dictionary", {facilityId: null, name: "+UI Shared", isExtendable: true}),
      );
      await openPage(page, `/admin/technicals/dictionaries/${dictId}`, (await loadConfig()).ui.admin);
      const main = page.locator("main");
      const addPosition = async (name: string, fillIn?: () => Promise<void>) => {
        await page.getByRole("button", {name: /actions\.position\.add/}).click();
        const heading = page.getByRole("heading", {name: /forms\.position_create\.form_name/});
        await expect(heading).toBeVisible();
        await formField(page, "name").fill(name);
        await fillIn?.();
        await submitButton(page, "position_create").click();
        await expect(heading).toHaveCount(0);
        await expect(tableRows(main, name)).toHaveCount(1);
      };

      // With no facility chosen the position is a global one.
      await addPosition("Everywhere");
      await addPosition("Only Here", async () => {
        await chooseInFormSelect(page, "facilityId", FACILITY.name);
        await formField(page, "isDisabled").check();
      });
      const {positions} = (await dictionaries(await api.loggedInAs(ADMIN))).find((d) => d.id === dictId)!;
      expect(positions).toMatchObject([
        {name: "+Everywhere", facilityId: null, isDisabled: false},
        {name: "+Only Here", facilityId, isDisabled: true},
      ]);
      await expect(tableRows(main, "Only Here")).toContainText(FACILITY.name);
      await expect(tableRows(main, "Everywhere")).not.toContainText(FACILITY.name);

      await test.step("the facility of a position cannot be changed", async () => {
        await tableRows(main, "Only Here").locator("title=actions.edit").click();
        await expect(page.getByRole("heading", {name: /forms\.position_edit\.form_name/})).toBeVisible();
        await expect(formSelect(page, "facilityId")).toContainText(FACILITY.name);
        await expect(formSelect(page, "facilityId")).toHaveAttribute("inert");
        await expect(formField(page, "isDisabled")).toBeChecked();
      });
    },
  );

  test("global admin creates an attribute of a facility, with its api name", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId} = artifact();
    const cfg = await loadConfig();
    await openPage(page, "/admin/technicals/attributes", cfg.ui.admin);
    await page.getByRole("button", {name: /actions\.attribute\.add/}).click();
    await expect(page.getByRole("heading", {name: /forms\.attribute_create\.form_name/})).toBeVisible();
    await expect(page.getByRole("checkbox", {name: "forms.generic.advanced_view"})).toHaveCount(0);
    await expectSectionShown(formField(page, "apiName"), true);
    await chooseInFormSelect(page, "facilityId", FACILITY.name);
    await formField(page, "name").fill("UI by global admin");
    await formField(page, "apiName").fill("uiByGlobalAdmin");
    await submitButton(page, "attribute_create").click();
    await expectFormSuccess(page, "attribute_create");
    expect((await attributes(await api.loggedInAs(ADMIN))).find((a) => a.name === "+UI by global admin")).toMatchObject(
      {apiName: "uiByGlobalAdmin", facilityId, model: "client", type: "string"},
    );
  });

  test(
    "staff edits a client's custom attributes; a new dictionary position is offered",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, colourDictId, colourIds, taggedClientId} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const res = await adminApi.post(`facility/${facilityId}/admin/position`, {
        dictionaryId: colourDictId,
        name: "+Violet",
        isDisabled: false,
      });
      const violetId = await createdId(res);

      await openPage(page, `/${FACILITY.url}/clients/${taggedClientId}`, STAFF);
      const main = page.locator("main");
      // View mode shows the values as plain text.
      await expect(main.getByText("E2E nickname")).toBeVisible();
      await expect(main.getByText(TAGGED_CLIENT_NICKNAME, {exact: true})).toBeVisible();
      await expect(main.getByRole("listitem").filter({hasText: /^Red$/})).toBeVisible();

      await page
        .getByRole("button", {name: /actions\.edit/})
        .first()
        .click();
      const nickname = page.locator(`input[name="client.${NICKNAME_ATTR.apiName}"]`);
      await expect(nickname).toHaveValue(TAGGED_CLIENT_NICKNAME);
      const colours = formSelect(page, `client.${COLOURS_ATTR.apiName}`);
      await expect(colours).toContainText("Red");
      await nickname.fill("Maverick");
      await colours.click();
      await expect(page.getByRole("option")).toHaveText([/Red/, /Green/, /Blue/, /Violet/]);
      await page.getByRole("option", {name: "Violet"}).click();
      await page.keyboard.press("Escape");
      await expect(colours).toContainText("Violet");
      await submitButton(page, "client_edit").click();
      await expectFormSuccess(page, "client_edit");

      expect(await clientAttributes(adminApi, facilityId, taggedClientId)).toMatchObject({
        [NICKNAME_ATTR.apiName]: "Maverick",
        [COLOURS_ATTR.apiName]: [colourIds.red, violetId],
      });
    },
  );
});
