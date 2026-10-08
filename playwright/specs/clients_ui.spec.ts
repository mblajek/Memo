import {clientAttributes} from "../helpers/queries.ts";
import type {Page} from "@playwright/test";
import {CLIENTS_ADULTS, CLIENTS_CHILDREN, clientsLayer} from "../lib/layers/clients.ts";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import {savedFile, stubSaveFilePicker} from "../helpers/saved_file.ts";
import {
  chooseInFormSelect,
  expectFormErrors,
  expectFormSuccess,
  formField,
  submitButton,
} from "../helpers/selectors.ts";
import {expect, login, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * UI-driven tests for the Clients feature, run inside the Test Clients layer so the seed has 10
 * adult/child clients ready to interact with. Setup via API; everything else through the UI.
 */

/** The button of the client details that makes the form editable. */
const editButton = (page: Page) => page.locator("form#client_edit").getByRole("button", {name: "actions.edit"});

clientsLayer.describe((artifact) => {
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
    await main.getByRole("button", {name: /csv_export\.label/}).click();
    // With everything on one page the only item is the "all pages" one.
    await page.getByRole("button", {name: /tables\.export\.all_pages/i}).click();
    await expect(page.getByText("csv_export.success")).toBeVisible();

    const {name, closed, lines} = await savedFile(page);
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
    await expect(form).toContainText("04/12/1985");
    await expect(form).toContainText("calendar.age_with_colon");
    await expect(form).toContainText("600 100 001");
    await expect(form).not.toContainText("Warszawa");

    await open(bea!);
    await expect(form).toContainText("dictionary.gender.female");
    await expect(form).toContainText("bea@example.test");
    await expect(form).toContainText("09/30/1987");
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
      /^attributes\.attributes\.client\.birthDate,04\/12\/1985$/i,
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

    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients/create$`));
    await expect(page.getByText("forms.client_create.success")).toHaveCount(0);
  });
});
