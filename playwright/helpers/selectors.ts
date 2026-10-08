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

/** All the data rows of the tables in the root. */
export function allTableRows(root: Page | Locator): Locator {
  return root.locator('[role="table"] [role="row"]:has(> [role="cell"])');
}

/** The data rows of a table containing the given text. */
export function tableRows(root: Page | Locator, hasText: string | RegExp): Locator {
  return allTableRows(root).filter({hasText});
}

/** The cell of a table row in the column of the given id. */
export function tableCell(row: Locator, columnId: string): Locator {
  return row.locator(`> [role="cell"][data-column="${columnId}"]`);
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
