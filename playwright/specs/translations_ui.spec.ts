import {meetingBlocks} from "../helpers/calendar.ts";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {expect, login, readOnlyTest, test} from "../lib/test.ts";
import type {Page} from "@playwright/test";

/**
 * A smoke test of the real translations. All the other tests run in the testing language, in
 * which a text is its key, so nothing else would notice a broken Polish text: a missing key, a
 * plural form, a parameter not filled in.
 */

/** A translation key shown in place of its text: the name of a translations file, then the path. */
const RAW_KEY =
  /\b(actions|attributes|calendar|dictionary|facility_user|forms|meetings|models|tables|validation)\.[a-z_]+[a-z]/;

async function expectNoRawTexts(page: Page) {
  const body = page.locator("body");
  await expect(body).not.toContainText(RAW_KEY);
  // A parameter left as it is in the translation.
  await expect(body).not.toContainText("{{");
}

meetingsLayer.describe((artifact) => {
  readOnlyTest("the calendar, a meeting and the client form are in Polish", {tag: "@ui"}, async ({page}) => {
    const {todayMeeting, adultClientInfos} = artifact();
    await login(page, STAFF);

    await test.step("the calendar and the details of a meeting", async () => {
      await page.goto(`/${FACILITY.url}/calendar?${new URLSearchParams({mode: "day", date: todayMeeting.date})}`);
      const main = page.locator("main");
      await expect(main.getByRole("button", {name: /^dzisiaj$/i})).toBeVisible();
      await main.getByRole("checkbox", {name: STAFF.name, exact: true}).check();
      await meetingBlocks(page, todayMeeting.id).click();
      await expect(page.getByRole("heading", {name: "Spotkanie"})).toBeVisible();
      // A plural form with its number.
      await expect(page.locator("span", {hasText: /^\(1 godzina\)$/})).toBeVisible();
      await expect(page.getByRole("button", {name: "Edytuj", exact: true})).toBeVisible();
      await expectNoRawTexts(page);
    });

    await test.step("a validation error names its field", async () => {
      await page.goto(`/${FACILITY.url}/clients/create`);
      await expect(page.getByRole("heading", {name: "Nowy klient"})).toBeVisible();
      await page.getByRole("button", {name: "Utwórz", exact: true}).click();
      await expect(page.getByText(/^Pole .+ jest wymagane\.$/).first()).toBeVisible();
      await expectNoRawTexts(page);
    });

    await test.step("the details of a client", async () => {
      await page.goto(`/${FACILITY.url}/clients/${adultClientInfos[1]!.id}`);
      await expect(page.getByRole("tab", {name: /^Zaplanowane/i})).toBeVisible();
      await expect(page.getByRole("button", {name: "Edytuj", exact: true}).first()).toBeVisible();
      await expectNoRawTexts(page);
    });
  });
});
