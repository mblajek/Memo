import {clientAttributes} from "../helpers/queries.ts";
import type {Locator, Page} from "@playwright/test";
import {shownDateWithWeekday, shownTableDate} from "../helpers/dates.ts";
import {dateOffset} from "../lib/dates.ts";
import {CLIENTS_ADULTS, CLIENTS_CHILDREN, clientsLayer} from "../lib/layers/clients.ts";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import {createdId} from "../lib/responses.ts";
import {savedFile, stubSaveFilePicker, exportTable} from "../helpers/saved_file.ts";
import {
  addToList,
  attributeRow,
  attributeValue,
  chooseAllInFormSelect,
  chooseInFormSelect,
  collapseSpaces,
  expectFormErrors,
  expectFormSuccess,
  expectSectionShown,
  formField,
  formSelect,
  formSelectClearButton,
  listInputs,
  removeFirstFromList,
  showTableColumns,
  submitButton,
  tableCellTexts,
  tableRows,
} from "../helpers/selectors.ts";
import {MemoAPI, expect, login, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * UI-driven tests for the Clients feature, run inside the Test Clients layer so the seed has 10
 * adult/child clients ready to interact with. Setup via API; everything else through the UI.
 */

/** The button of the client details that makes the form editable. */
const editButton = (page: Page) => page.locator("form#client_edit").getByRole("button", {name: "actions.edit"});

const EMPTY_VALUE = "—";

/**
 * The fields of a client other than the name, the type, the gender and the notification methods.
 */
const FULL = {
  shortCode: "4321",
  notes: "Likes tea\nSecond line",
  urgentNotes: ["Urgent one", "* low two"],
  birthDate: "2015-03-09",
  contactEmail: "full@example.test",
  contactPhone: "+48 601 202 303",
  addressStreetNumber: "Long Street 12/3",
  addressPostalCode: "00-950",
  addressCity: "Kraków",
  contactStartAt: "2024-01-15",
  contactEndAt: "2025-06-30",
  documentsLinks: ["https://example.test/doc1", "https://example.test/doc2"],
} as const;

/** The attributes of a client that the details hide while empty (the optional ones). */
const FOLDED_WHEN_EMPTY = [
  "urgentNotes",
  "addressStreetNumber",
  "addressPostalCode",
  "addressCity",
  "contactEndAt",
  "documentsLinks",
  "notificationMethodDictIds",
] as const;
/** The ones shown with a dash (the recommended ones). */
const SHOWN_WHEN_EMPTY = ["genderDictId", "birthDate", "contactEmail", "contactPhone", "contactStartAt"] as const;

/** The columns of the clients table that have the fields of the client form. */
const FIELD_COLUMNS = [
  "shortCode",
  "typeDictId",
  "genderDictId",
  "notes",
  "urgentNotes",
  "urgentNotes.count",
  "birthDate",
  "contactEmail",
  "contactPhone",
  "addressStreetNumber",
  "addressPostalCode",
  "addressCity",
  "contactStartAt",
  "contactEndAt",
  "documentsLinks",
  "notificationMethodDictIds",
].map((field) => `client.${field}`);
/** Those of them that the table shows from the start. */
const COLUMNS_SHOWN_INITIALLY = ["typeDictId", "birthDate", "contactEmail", "contactPhone", "addressCity"].map(
  (field) => `client.${field}`,
);

const notesBox = (form: Locator) => form.locator('[data-field-box="client.notes"]');

/** The fields of the client that the form has, as the server has them. */
async function clientFields(api: MemoAPI, facilityId: string, clientUserId: string) {
  const {
    groupIds: _groupIds,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    createdBy: _createdBy,
    updatedBy: _updatedBy,
    ...fields
  } = await clientAttributes(api, facilityId, clientUserId);
  return fields;
}

/** The value of each of the attributes as the client details show it. */
async function shownAttributes(form: Locator, apiNames: readonly string[]) {
  const shown: Record<string, string> = {};
  for (const apiName of apiNames) {
    shown[apiName] = collapseSpaces(await attributeValue(form, apiName).innerText());
  }
  return shown;
}

/** The row of the client in the clients table, opened with the columns of all the fields shown. */
async function openTableRow(page: Page, clientName: string) {
  await openPage(page, `/${FACILITY.url}/clients`);
  const main = page.locator("main");
  await expect(tableRows(main, clientName)).toHaveCount(1);
  await showTableColumns(
    page,
    main,
    "client",
    FIELD_COLUMNS.filter((column) => !COLUMNS_SHOWN_INITIALLY.includes(column)),
  );
  return tableRows(main, clientName);
}

clientsLayer.describe((artifact) => {
  const clientIdByName = async (api: MemoAPI, name: string) => {
    const {rows} = await api.tquery<{id: string}>(`facility/${artifact().facilityId}/user/client/tquery`, {
      columns: ["id"],
      filter: {type: "column", column: "name", op: "=", val: name},
    });
    expect(rows).toHaveLength(1);
    return rows[0]!.id;
  };

  test(
    "a client created with the name and the type only has nothing else but the start date",
    {tag: "@ui"},
    async ({page, api}) => {
      const staffApi = await api.loggedInAs(STAFF);
      const {clientType} = await staffApi.dictionaries();
      await openPage(page, `/${FACILITY.url}/clients/create`, STAFF);
      const name = "Minimal Client";
      await formField(page, "name").fill(name);
      await chooseInFormSelect(page, "client.typeDictId", /clientType\.adult/);
      // The only field the form fills in by itself.
      const today = dateOffset(0);
      await expect(formField(page, "client.contactStartAt")).toHaveValue(today);
      await submitButton(page, "client_create").click();
      await expectFormSuccess(page, "client_create");

      const clientId = await clientIdByName(staffApi, name);
      // The short code is the next one after those of the ten seeded clients.
      expect(await clientFields(staffApi, artifact().facilityId, clientId)).toEqual({
        shortCode: "11",
        typeDictId: clientType!.adult,
        contactStartAt: today,
      });

      await test.step("the details", async () => {
        await expect(page).toHaveURL(new RegExp(`/clients/${clientId}$`));
        const form = page.locator("form#client_edit");
        await expect(formField(form, "name")).toHaveValue(name);
        expect(await shownAttributes(form, ["shortCode", "typeDictId", ...SHOWN_WHEN_EMPTY])).toEqual({
          shortCode: "11",
          typeDictId: "dictionary.clientType.adult",
          ...Object.fromEntries(SHOWN_WHEN_EMPTY.map((apiName) => [apiName, EMPTY_VALUE])),
          contactStartAt: shownDateWithWeekday(today),
        });
        for (const apiName of SHOWN_WHEN_EMPTY) {
          await expectSectionShown(attributeRow(form, apiName), true);
        }
        for (const apiName of FOLDED_WHEN_EMPTY) {
          await expectSectionShown(attributeRow(form, apiName), false);
        }
        await expect(notesBox(form)).toContainText(EMPTY_VALUE);
      });

      await test.step("the row of the clients table", async () => {
        const row = await openTableRow(page, name);
        await expect
          .poll(() => tableCellTexts(row, FIELD_COLUMNS))
          .toEqual({
            ...Object.fromEntries(FIELD_COLUMNS.map((column) => [column, EMPTY_VALUE])),
            "client.shortCode": "11",
            "client.typeDictId": "dictionary.clientType.adult",
            "client.urgentNotes.count": "0",
            "client.contactStartAt": shownTableDate(today),
          });
      });
    },
  );

  test("a client created with every field of the form has each of them", {tag: "@ui"}, async ({page, api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {clientType, gender, notificationMethod} = await staffApi.dictionaries();
    await openPage(page, `/${FACILITY.url}/clients/create`, STAFF);
    const form = page.locator("#client_create");
    const name = "Maximal Client";
    await formField(form, "name").fill(name);
    await formField(form, "client.shortCode").fill(FULL.shortCode);
    await chooseInFormSelect(page, "client.typeDictId", /clientType\.child/);
    await chooseInFormSelect(page, "client.genderDictId", /gender\.female/);
    for (const note of FULL.urgentNotes) {
      await addToList(form, "urgentNotes", note);
    }
    for (const field of [
      "birthDate",
      "contactEmail",
      "contactPhone",
      "addressStreetNumber",
      "addressPostalCode",
      "addressCity",
      "contactStartAt",
      "contactEndAt",
    ] as const) {
      await formField(form, `client.${field}`).fill(FULL[field]);
    }
    for (const link of FULL.documentsLinks) {
      await addToList(form, "documentsLinks", link);
    }
    await chooseAllInFormSelect(page, form, "client.notificationMethodDictIds", ["dictionary.notificationMethod.sms"]);
    await form.locator('textarea[name="client.notes"]').fill(FULL.notes);
    await submitButton(page, "client_create").click();
    await expectFormSuccess(page, "client_create");

    const clientId = await clientIdByName(staffApi, name);
    expect(await clientFields(staffApi, artifact().facilityId, clientId)).toEqual({
      ...FULL,
      typeDictId: clientType!.child,
      genderDictId: gender!.female,
      notificationMethodDictIds: [notificationMethod!.sms],
    });

    await test.step("the details", async () => {
      await expect(page).toHaveURL(new RegExp(`/clients/${clientId}$`));
      const details = page.locator("form#client_edit");
      await expect(formField(details, "name")).toHaveValue(name);
      const shown = await shownAttributes(details, [
        "shortCode",
        "typeDictId",
        ...SHOWN_WHEN_EMPTY,
        ...FOLDED_WHEN_EMPTY,
      ]);
      expect(shown).toEqual({
        shortCode: FULL.shortCode,
        typeDictId: "dictionary.clientType.child",
        genderDictId: "dictionary.gender.female",
        urgentNotes: "Urgent one, * low two",
        // The date in the browser's locale, followed by the age.
        birthDate: expect.stringMatching(/^09\.03\.2015 .*calendar\.units\.years\{count:\d+\}/),
        contactEmail: FULL.contactEmail,
        // A number of the app's country is shown without the country's prefix.
        contactPhone: "601 202 303",
        addressStreetNumber: FULL.addressStreetNumber,
        addressPostalCode: FULL.addressPostalCode,
        addressCity: FULL.addressCity,
        contactStartAt: "poniedziałek, 15.01.2024",
        contactEndAt: "poniedziałek, 30.06.2025",
        documentsLinks: FULL.documentsLinks.join(" "),
        notificationMethodDictIds: "dictionary.notificationMethod.sms",
      });
      for (const apiName of FOLDED_WHEN_EMPTY) {
        await expectSectionShown(attributeRow(details, apiName), true);
      }
      for (const link of FULL.documentsLinks) {
        await expect(attributeRow(details, "documentsLinks").getByRole("link", {name: link})).toHaveAttribute(
          "href",
          link,
        );
      }
      await expect(notesBox(details)).toContainText("Likes tea");
      await expect(notesBox(details)).toContainText("Second line");
    });

    await test.step("the row of the clients table", async () => {
      const row = await openTableRow(page, name);
      await expect
        .poll(() => tableCellTexts(row, FIELD_COLUMNS))
        .toEqual({
          "client.shortCode": FULL.shortCode,
          "client.typeDictId": "dictionary.clientType.child",
          "client.genderDictId": "dictionary.gender.female",
          "client.notes": "Likes tea Second line",
          // The mark of a low priority note comes as the star it is entered with.
          "client.urgentNotes": "Urgent one *low two",
          "client.urgentNotes.count": "2",
          "client.birthDate": "09.03.2015",
          "client.contactEmail": FULL.contactEmail,
          "client.contactPhone": "601 202 303",
          "client.addressStreetNumber": FULL.addressStreetNumber,
          "client.addressPostalCode": FULL.addressPostalCode,
          "client.addressCity": FULL.addressCity,
          "client.contactStartAt": "calendar.weekday_overrides.pon. , 15.01.2024",
          "client.contactEndAt": "calendar.weekday_overrides.pon. , 30.06.2025",
          "client.documentsLinks": FULL.documentsLinks.join(" "),
          "client.notificationMethodDictIds": "dictionary.notificationMethod.sms",
        });
    });
  });

  test("each optional field of a client is cleared in the edit form", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const {clientType, gender, notificationMethod} = await staffApi.dictionaries();
    const client = {
      ...FULL,
      typeDictId: clientType!.child!,
      genderDictId: gender!.female,
      notificationMethodDictIds: [notificationMethod!.sms],
    };
    const clientId = await createdId(await staffApi.createFacilityClient(facilityId, {name: "Cleared Client", client}));
    await openPage(page, `/${FACILITY.url}/clients/${clientId}`, STAFF);
    const form = page.locator("form#client_edit");
    await editButton(page).click();

    await test.step("the form starts from the values", async () => {
      for (const field of [
        "shortCode",
        "birthDate",
        "contactEmail",
        "contactPhone",
        "addressStreetNumber",
        "addressPostalCode",
        "addressCity",
        "contactStartAt",
        "contactEndAt",
      ] as const) {
        await expect(formField(form, `client.${field}`), field).toHaveValue(FULL[field]);
      }
      await expect(formSelect(form, "client.typeDictId")).toContainText("dictionary.clientType.child");
      await expect(formSelect(form, "client.genderDictId")).toContainText("dictionary.gender.female");
      await expect(formSelect(form, "client.notificationMethodDictIds")).toContainText(
        "dictionary.notificationMethod.sms",
      );
      await expect(listInputs(form, "urgentNotes")).toHaveCount(2);
      await expect(listInputs(form, "urgentNotes").last()).toHaveValue(FULL.urgentNotes[1]);
      await expect(listInputs(form, "documentsLinks")).toHaveCount(2);
      await expect(listInputs(form, "documentsLinks").first()).toHaveValue(FULL.documentsLinks[0]);
      await expect(form.locator('textarea[name="client.notes"]')).toHaveValue(FULL.notes);
      // The required select has nothing to clear it with.
      await expect(formSelectClearButton(form, "client.typeDictId")).toHaveCount(0);
    });

    for (const field of [
      "birthDate",
      "contactEmail",
      "contactPhone",
      "addressStreetNumber",
      "addressPostalCode",
      "addressCity",
      "contactStartAt",
      "contactEndAt",
    ]) {
      await formField(form, `client.${field}`).fill("");
    }
    await formSelectClearButton(form, "client.genderDictId").click();
    await formSelectClearButton(form, "client.notificationMethodDictIds").click();
    for (const list of ["urgentNotes", "documentsLinks"]) {
      await removeFirstFromList(form, list);
      await removeFirstFromList(form, list);
    }
    await form.locator('textarea[name="client.notes"]').fill("");
    await submitButton(page, "client_edit").click();
    await expectFormSuccess(page, "client_edit");

    expect(await clientFields(staffApi, facilityId, clientId)).toEqual({
      shortCode: FULL.shortCode,
      typeDictId: clientType!.child,
    });
    await expect
      .poll(() => shownAttributes(form, SHOWN_WHEN_EMPTY))
      .toEqual(Object.fromEntries(SHOWN_WHEN_EMPTY.map((apiName) => [apiName, EMPTY_VALUE])));
    for (const apiName of FOLDED_WHEN_EMPTY) {
      await expectSectionShown(attributeRow(form, apiName), false);
    }
    await expect(notesBox(form)).toContainText(EMPTY_VALUE);
  });

  test("staff creates a new client via the /clients/create UI form", {tag: "@ui"}, async ({page, api}) => {
    await openPage(page, `/${FACILITY.url}/clients`, STAFF);

    await page.getByRole("button", {name: /actions\.client\.add/}).click();
    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients/create$`));
    await expect(page.getByRole("heading", {name: /forms\.client_create\.form_name/})).toBeVisible();

    const newName = "UI-Created Test Client";
    await formField(page, "name").fill(newName);
    await chooseInFormSelect(page, "client.typeDictId", /clientType\.adult/);
    await submitButton(page, "client_create").click();
    await expectFormSuccess(page, "client_create");

    const {facilityId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const {clientType} = await staffApi.dictionaries();
    const {rows} = await staffApi.tquery(`facility/${facilityId}/user/client/tquery`, {
      columns: ["name", "client.typeDictId"],
      filter: {type: "column", column: "name", op: "=", val: newName},
    });
    expect(rows).toEqual([{"name": newName, "client.typeDictId": clientType!.adult}]);
  });

  test("staff edits a client's name via the details page Edit button", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, adultClientInfos} = artifact();
    const target = adultClientInfos[3]!;
    await openPage(page, `/${FACILITY.url}/clients/${target.id}`, STAFF);
    await expect(page.getByText(target.name).first()).toBeVisible();
    await editButton(page).click();
    const nameInput = formField(page, "name");
    await expect(nameInput).toBeVisible();
    const newName = `${target.name} (UI edited)`;
    await nameInput.fill(newName);
    await submitButton(page, "client_edit").click();

    await expectFormSuccess(page, "client_edit");

    const staffApi = await api.loggedInAs(STAFF);
    const data = await staffApi.list<{name: string}>(`facility/${facilityId}/user/client`, target.id);
    expect(data[0]!.name).toBe(newName);
  });

  readOnlyTest(
    "staff cancels client edit; the name field is read-only again with the original value",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, adultClientInfos} = artifact();
      const target = adultClientInfos[2]!;
      await openPage(page, `/${FACILITY.url}/clients/${target.id}`, STAFF);
      await editButton(page).click();
      const nameInput = formField(page, "name");
      await expect(nameInput).toBeEnabled();
      await nameInput.fill("DON'T SAVE ME");

      await page
        .getByRole("button", {name: /actions\.cancel/})
        .first()
        .click();
      // The form is dirty, so leaving it asks for confirmation.
      await page.getByRole("button", {name: /form_page_leave_confirmation\.confirm/}).click();

      await expect(nameInput).toBeDisabled();
      await expect(nameInput).toHaveValue(target.name);

      const staffApi = await api.loggedInAs(STAFF);
      const body = await staffApi.list<{name: string}>(`facility/${facilityId}/user/client`, target.id);
      expect(body[0]!.name).toBe(target.name);
    },
  );

  readOnlyTest("clicking a client in the list navigates to the client details page", {tag: "@ui"}, async ({page}) => {
    const {adultClientInfos} = artifact();
    const target = adultClientInfos[0]!;
    await openPage(page, `/${FACILITY.url}/clients`, STAFF);
    await page.locator("main").getByRole("link", {name: target.name}).first().click();
    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients/${target.id}`));
    await expect(page.getByText(target.name).first()).toBeVisible();
  });

  readOnlyTest("clicking the name column header sorts the list in both directions", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/clients`, STAFF);
    const main = page.locator("main");
    const allNames = [...CLIENTS_ADULTS, ...CLIENTS_CHILDREN];
    const ascending = allNames.toSorted();
    const nameLinks = main.getByRole("link", {name: new RegExp(`^(${allNames.join("|")})$`)});
    const header = main.getByRole("button", {name: "tables.tables.client.column_names.name"});
    // The header cycles through the sort directions; click until the list is ascending.
    await expect(async () => {
      await header.click();
      await expect(nameLinks).toHaveText(ascending, {timeout: 2_000});
    }).toPass();
    await header.click();
    await expect(nameLinks).toHaveText(ascending.toReversed());
  });

  readOnlyTest("the clients list exports to CSV", {tag: "@ui"}, async ({page}) => {
    await stubSaveFilePicker(page);
    await openPage(page, `/${FACILITY.url}/clients`, STAFF);
    const main = page.locator("main");
    await expect(main.getByRole("link", {name: CLIENTS_ADULTS[0]!})).toBeVisible();
    // With everything on one page the only item is the "all pages" one.
    const {name, closed, lines} = await exportTable(page, main);
    expect(closed).toBe(true);
    expect(name).toMatch(/\.(csv|tsv|txt)$/);
    const allNames = [...CLIENTS_ADULTS, ...CLIENTS_CHILDREN];
    // A header line, then one line per client.
    expect(lines).toHaveLength(allNames.length + 1);
    expect(lines[0]).toMatch(/tables\.tables\.client\.column_names\.name/i);
    for (const name of allNames) {
      expect(
        lines.filter((line) => line.includes(name)),
        name,
      ).toHaveLength(1);
    }
  });

  readOnlyTest("client details show the seeded fields of the client", {tag: "@ui"}, async ({page}) => {
    const {adultClientInfos} = artifact();
    const [adam, bea, carl, diana] = adultClientInfos;
    await login(page, STAFF);
    // In the view mode the attributes are plain text.
    const form = page.locator("form#client_edit");
    async function open(client: {id: string; name: string}) {
      await openPage(page, `/${FACILITY.url}/clients/${client.id}`);
      await expect(formField(form, "name")).toHaveValue(client.name);
    }

    await open(adam!);
    await expect(form).toContainText("dictionary.clientType.adult");
    await expect(form).toContainText("dictionary.gender.male");
    // The date comes in the browser's locale, followed by the age.
    await expect(form).toContainText("12.04.1985");
    await expect(form).toContainText("calendar.age_with_colon");
    await expect(form).toContainText("600 100 001");
    await expect(form).not.toContainText("Warszawa");

    await open(bea!);
    await expect(form).toContainText("dictionary.gender.female");
    await expect(form).toContainText("bea@example.test");
    await expect(form).toContainText("30.09.1987");
    await expect(form).not.toContainText("600 100 001");

    await open(carl!);
    await expect(form).toContainText("Warszawa");

    await open(diana!);
    await expect(form).toContainText("VIP client");
  });

  readOnlyTest("a single client exports to CSV from the details page", {tag: "@ui"}, async ({page}) => {
    const adam = artifact().adultClientInfos[0]!;
    await stubSaveFilePicker(page);
    await openPage(page, `/${FACILITY.url}/clients/${adam.id}`, STAFF);
    // A split button: its main part exports straight away, the other one opens the formats.
    await page.locator("title=facility_user.client.csv_export_label").first().click();
    await expect(page.getByText("csv_export.success")).toBeVisible();

    const {name, closed, lines} = await savedFile(page);
    expect(closed).toBe(true);
    expect(name).toContain("Adam_Kowalski");
    // One field per line, the dates in the browser's locale.
    for (const line of [
      /^tables\.tables\.client\.column_names\.name,"Adam Kowalski"$/i,
      /^attributes\.attributes\.client\.type,dictionary\.clientType\.adult$/i,
      /^attributes\.attributes\.client\.birthDate,12\.04\.1985$/i,
      /^attributes\.attributes\.client\.contactPhone,"\+48 600 100 001"$/i,
      /^attributes\.attributes\.client\.contactEmail,$/i,
    ]) {
      expect(
        lines.filter((l) => line.test(l)),
        String(line),
      ).toHaveLength(1);
    }
    expect(lines.join("\n")).not.toContain("Bea");
  });

  readOnlyTest("the client form shows each validation error at its field", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, adultClientInfos} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const takenShortCode = (await clientAttributes(staffApi, facilityId, adultClientInfos[0]!.id)).shortCode as string;
    await openPage(page, `/${FACILITY.url}/clients/create`, STAFF);
    const form = page.locator("#client_create");
    const submit = submitButton(page, "client_create");
    const field = (name: string) => formField(form, name);
    // The type has no default, so its error stays through all the steps.
    const typeRequired = {"client.typeDictId": "required"};

    await test.step("nothing filled in", async () => {
      await submit.click();
      await expectFormErrors(form, {name: "required", ...typeRequired});
      await expect(field("name")).toHaveAttribute("aria-invalid", "true");
    });

    await test.step("the short code: not a number, too long, taken", async () => {
      await field("name").fill("Validated Client");
      await field("client.shortCode").fill("abc");
      await submit.click();
      await expectFormErrors(form, {"client.shortCode": "regex", ...typeRequired});
      await expect(field("name")).not.toHaveAttribute("aria-invalid", "true");
      await field("client.shortCode").fill("12345678");
      await submit.click();
      await expectFormErrors(form, {"client.shortCode": "max.string", ...typeRequired});
      await field("client.shortCode").fill(takenShortCode);
      await submit.click();
      await expectFormErrors(form, {"client.shortCode": "custom.client_short_code", ...typeRequired});
      // Leading zeros do not make it another code.
      await field("client.shortCode").fill(`0${takenShortCode}`);
      await submit.click();
      await expectFormErrors(form, {"client.shortCode": "custom.client_short_code", ...typeRequired});
    });

    await test.step("a text too long", async () => {
      await field("client.shortCode").fill("");
      await field("client.addressCity").fill("x".repeat(251));
      await submit.click();
      await expectFormErrors(form, {"client.addressCity": "max.string", ...typeRequired});
    });

    await test.step("the name, the notes and the values of the lists too long", async () => {
      await field("client.addressCity").fill("");
      await field("name").fill("x".repeat(251));
      await addToList(form, "urgentNotes", "x".repeat(251));
      await addToList(form, "urgentNotes", "");
      await addToList(form, "documentsLinks", "x".repeat(4001));
      await form.locator('textarea[name="client.notes"]').fill("x".repeat(4001));
      await submit.click();
      await expectFormErrors(form, {
        "name": "max.string",
        "client.urgentNotes.0": "max.string",
        "client.documentsLinks.0": "max.string",
        "client.notes": "max.string",
        ...typeRequired,
      });
    });

    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients/create$`));
    await expect(page.getByText("forms.client_create.success")).toHaveCount(0);
  });
});
