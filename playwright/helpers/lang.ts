import {expect, test, type Page} from "@playwright/test";

const TESTING_LANGUAGE = "testing";

interface WindowWithI18Next {
  readonly i18next?: {
    changeLanguage(l: string): Promise<unknown>;
  };
}

/**
 * Switches the running app into the testing language: lang(key) returns the key itself, with
 * options appended as `{k:v,...}`. Waits for translations to actually render before returning.
 */
export async function disableTranslations(page: Page) {
  await test.step(
    "Switch to testing language",
    async () => {
      await page.evaluate((lng) => {
        sessionStorage.setItem("language", lng);
        void (window as unknown as WindowWithI18Next).i18next?.changeLanguage(lng);
      }, TESTING_LANGUAGE);
      await expect(page.getByText("app_version").first()).toBeVisible();
    },
    {box: true},
  );
}
