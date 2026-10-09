import {expect, selectors, type Locator, type Page} from "@playwright/test";

let registered = false;

/**
 * Registers Memo-specific custom selector engines. Must be called once before any test/page.
 *
 * - `title=<key>` — matches elements with `aria-description="<key>"` (set by the `use:title`
 *   directive and by Button's `title` prop). In the testing language, `<key>` is the literal
 *   i18n key. Usage: `page.locator('title=user_settings')`.
 */
export async function registerSelectors() {
  if (registered) {
    return;
  }
  await selectors.register("title", () => ({
    queryAll(root: Element, selector: string): Element[] {
      return Array.from(root.querySelectorAll(`[aria-description="${CSS.escape(selector)}"]`));
    },
  }));
  registered = true;
}

/**
 * The combobox of the form `Select` bound to the given field name. The comboboxes carry no
 * accessible name; each follows a hidden element holding the field's value.
 */
export function formSelect(root: Page | Locator, fieldName: string): Locator {
  return root.locator(`[name="${fieldName}"] + [role="combobox"]`);
}

/** Picks the option with the given text in the form `Select` bound to the given field name. */
export async function chooseInFormSelect(page: Page, fieldName: string, optionText: string | RegExp) {
  await formSelect(page, fieldName).click();
  await page.getByRole("option", {name: optionText}).click();
}

/**
 * Picks the options in the multiple form `Select` of the form, and closes its list. The list is
 * closed with a click on the first label of the form, so that must be the label of a text field:
 * the click focuses the label's control (and would toggle a checkbox).
 */
export async function chooseAllInFormSelect(page: Page, form: Locator, fieldName: string, options: readonly string[]) {
  await formSelect(form, fieldName).click();
  for (const option of options) {
    await page.getByRole("option", {name: option}).click();
  }
  // Escape may do more than close the list.
  await form.locator("label").first().click();
}

/**
 * The button clearing the form `Select` bound to the given field name; there while it has a
 * value.
 */
export function formSelectClearButton(root: Page | Locator, fieldName: string): Locator {
  return formSelect(root, fieldName).locator("title=actions.clear");
}

/** All the data rows of the tables in the root. */
export function allTableRows(root: Page | Locator): Locator {
  return root.locator('[role="table"] [role="row"]:has(> [role="cell"])');
}

/** The data rows of a table containing the given text. */
export function tableRows(root: Page | Locator, hasText: string | RegExp): Locator {
  return allTableRows(root).filter({hasText});
}

/** The data rows of a table whose cell in the column of the given id has exactly the text. */
export function tableRowsWithCell(root: Page | Locator, columnId: string, text: string): Locator {
  const page = "page" in root ? root.page() : root;
  return allTableRows(root).filter({
    has: page.locator(`[role="cell"][data-column="${columnId}"]`).getByText(text, {exact: true}),
  });
}

/** The cell of a table row in the column of the given id. */
export function tableCell(row: Locator, columnId: string): Locator {
  return row.locator(`> [role="cell"][data-column="${columnId}"]`);
}

/** The header of the table's column of the given id; there while the column is shown. */
export function columnHeader(root: Page | Locator, columnId: string): Locator {
  return root.locator(`[data-header-for-column="${columnId}"]`);
}

/** The button clearing the filter of the column; there while the filter is set. */
export function clearFilterButton(root: Page | Locator, columnId: string): Locator {
  return columnHeader(root, columnId).locator('[aria-description^="tables.filter.filter_set"]');
}

/** The button clearing the filters of all the columns of the table in the root. */
export function clearAllFiltersButton(root: Page | Locator): Locator {
  return root.locator("[data-table-filters-clear] button");
}

/**
 * The checkbox of a column in the open column chooser of a table. The table name is the one of
 * the translations (`tables.tables.<name>`).
 */
export function columnChooserBox(page: Page, tableName: string, column: string): Locator {
  return page.getByRole("checkbox", {name: `tables.tables.${tableName}.column_names.${column}`, exact: true});
}

/** A click in the corner of the page, away from anything: closes an open menu or list. */
export async function clickOutside(page: Page) {
  await page.locator("body").click({position: {x: 5, y: 5}});
}

/**
 * Ticks the columns in the column chooser of the table in the root, and waits for them to show.
 * The table name is the one of the translations (`tables.tables.<name>`).
 */
export async function showTableColumns(page: Page, root: Locator, tableName: string, columns: readonly string[]) {
  await root.getByRole("button", {name: "tables.choose_columns"}).click();
  for (const column of columns) {
    await columnChooserBox(page, tableName, column).check();
  }
  await clickOutside(page);
  for (const column of columns) {
    await expect(columnHeader(root, column)).toBeVisible();
  }
}

/**
 * The texts of the cells of a table row in the given columns, by column, with the spaces collapsed.
 * The cells of a column that was just shown are empty until the table has its data loaded.
 */
export async function tableCellTexts(row: Locator, columnIds: readonly string[]) {
  return Object.fromEntries(
    await Promise.all(
      columnIds.map(
        async (columnId) => [columnId, collapseSpaces(await tableCell(row, columnId).innerText())] as const,
      ),
    ),
  );
}

export function collapseSpaces(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** The input of the form bound to the given field name. */
export function formField(form: Page | Locator, fieldName: string): Locator {
  return form.locator(`input[name="${fieldName}"]`);
}

/** The submit button of the form of the given translations key (`forms.<key>.submit`). */
export function submitButton(page: Page, formKey: string): Locator {
  return page.getByRole("button", {name: `forms.${formKey}.submit`});
}

/** Asserts that the success message of the form of the given translations key is shown. */
export async function expectFormSuccess(page: Page, formKey: string) {
  await expect(page.getByText(`forms.${formKey}.success`)).toBeVisible();
}

/**
 * Asserts that the `HideableSection` holding the given content is unfolded, or folded. A folded
 * section keeps its content in the DOM with its own size, so `toBeVisible` / `toBeHidden` cannot
 * tell the two states apart.
 */
export async function expectSectionShown(content: Locator, shown: boolean) {
  const section = content.locator('xpath=ancestor::div[contains(@class, "overflow-y-hidden")][1]');
  await expect(section).toHaveCSS("max-height", shown ? "none" : "0px");
}

/**
 * Asserts that the form shows exactly the given validation errors, in the testing language, in
 * which an error reads `validation.<rule>{attribute:…field_names.<field>…}`. The expected errors
 * are the rule (or rules) by field, both without the prefixes: `{url: "max.string"}`. The field is
 * the one the error names, wherever in the form it is shown.
 */
export async function expectFormErrors(form: Locator, expected: Readonly<Record<string, string | readonly string[]>>) {
  const expectedRules = Object.fromEntries(
    Object.entries(expected).map(([field, rules]) => [
      field,
      (typeof rules === "string" ? [rules] : [...rules]).sort(),
    ]),
  );
  await expect(async () => {
    const shown: Record<string, string[]> = {};
    for (const text of await form.locator('ul[aria-live="polite"] li').allTextContents()) {
      const match = /^validation\.([^{]+)\{attribute:[^}]*?field_names\.([^}]+)\}/.exec(text);
      if (!match) {
        throw new Error(`Not a validation error of a field: ${text}`);
      }
      (shown[match[2]!] ||= []).push(match[1]!);
    }
    for (const rules of Object.values(shown)) {
      rules.sort();
    }
    expect(shown).toEqual(expectedRules);
  }).toPass({timeout: 10_000});
}

/**
 * The row of the attribute of the given api name among the attribute fields of a form: its label,
 * its value or its control, and the mark of its requirement level.
 */
export function attributeRow(form: Page | Locator, apiName: string): Locator {
  return form.locator(`[data-attribute="${apiName}"]`);
}

/** The value of the attribute's row (in the view mode), or its control. */
export function attributeValue(form: Page | Locator, apiName: string): Locator {
  return attributeRow(form, apiName).locator("> div").first();
}

/** The inputs of the values of a list attribute other than a dictionary one. */
export function listInputs(form: Page | Locator, apiName: string): Locator {
  return attributeRow(form, apiName).locator("input, textarea");
}

/** Adds a value to a list attribute: its row has the "add" button last. */
export async function addToList(form: Page | Locator, apiName: string, value: string) {
  const inputs = listInputs(form, apiName);
  const count = await inputs.count();
  await attributeRow(form, apiName).getByRole("button").last().click();
  await expect(inputs).toHaveCount(count + 1);
  await inputs.last().fill(value);
}

/** Removes the first value of a list attribute: the first button of its row deletes it. */
export async function removeFirstFromList(form: Page | Locator, apiName: string) {
  const inputs = listInputs(form, apiName);
  const count = await inputs.count();
  await attributeRow(form, apiName).getByRole("button").first().click();
  await expect(inputs).toHaveCount(count - 1);
}
