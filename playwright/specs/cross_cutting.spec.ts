import {DateTime} from "luxon";
import type {Browser, Page} from "@playwright/test";
import {meetingBlocks, resourceInput} from "../helpers/calendar.ts";
import {loadConfig} from "../lib/config.ts";
import {dateOffset} from "../lib/dates.ts";
import {FACILITY, STAFF, facilityLayer} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {expect, login, MemoAPI, openPage, readOnlyTest} from "../lib/test.ts";
import {formField} from "../helpers/selectors.ts";

/** Concerns that are not about one feature: the session, the app's version, the time zone. */

interface SystemStatus {
  readonly userTimezone: string;
  readonly commitHash: string | null;
  readonly version: string;
}

facilityLayer.describe(() => {
  readOnlyTest("a lost session brings up the login form at the next request", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/staff`, STAFF);
    await expect(page.locator("main").getByText(STAFF.name).first()).toBeVisible();
    const emailInput = formField(page, "email");
    await expect(emailInput).toHaveCount(0);

    // Only the browser forgets the session: on the server it stays valid, for the tests after this one.
    // Every response sets the session cookie anew, so wait for the requests of the page to finish.
    await page.waitForLoadState("networkidle");
    await page.context().clearCookies();
    await page.locator(`nav a[href="/${FACILITY.url}/clients"]`).click();
    await expect(emailInput).toBeVisible();
    await expect(formField(page, "password")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    // Nothing of the facility is left on the screen.
    await expect(page.getByText(FACILITY.name)).toHaveCount(0);
    await expect(page.getByText(STAFF.name)).toHaveCount(0);
  });

  readOnlyTest("a new version of the backend is announced, with a button to reload", {tag: "@ui"}, async ({page}) => {
    let changed = false;
    await page.route("**/api/v1/system/status", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as {data: SystemStatus};
      if (changed) {
        body.data = {...body.data, commitHash: "e2e-new-commit", version: `${body.data.version}-e2e`};
      }
      await route.fulfill({response, json: body});
    });
    await openPage(page, `/${FACILITY.url}/staff`, STAFF);
    const reloadButton = page.getByRole("button", {name: "system_version_update"});
    const version = page.getByText(/app_version\{version:[^}]+\}/);
    await expect(version).toBeVisible();
    await expect(reloadButton).toHaveCount(0);

    // The status is asked for every minute, and whenever the window gets the focus back.
    changed = true;
    await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
    await expect(reloadButton).toBeVisible();
    // The page stays as it is, usable, until reloaded.
    await expect(version).toBeVisible();
    await expect(version).not.toContainText("-e2e");
    await expect(page.locator("main").getByText(STAFF.name).first()).toBeVisible();

    // The button pulsates for ever, so it never passes for stable.
    await reloadButton.click({force: true});
    await expect(reloadButton).toHaveCount(0);
    await disableTranslations(page);
    await expect(page.getByText(/app_version\{version:[^}]+-e2e\}/)).toBeVisible();
    await expect(reloadButton).toHaveCount(0);
  });
});

/**
 * A page in a browser for which it is another day than in the app's time zone already, or still:
 * 12 or 13 hours ahead of it in its afternoon, or as much behind it in its morning. Skips the test
 * if the seeded "today" — the today of the machine running the tests — is not the app's today.
 */
async function withFarTimeZonePage(api: MemoAPI, browser: Browser, body: (page: Page) => Promise<void>) {
  const status = await api.getData<SystemStatus>("system/status");
  const appNow = DateTime.now().setZone(status.userTimezone);
  readOnlyTest.skip(
    appNow.toISODate() !== dateOffset(0),
    `the tests run in a time zone where it is not the same day as in the app's (${status.userTimezone})`,
  );
  const timezoneId = appNow.hour >= 12 ? "Pacific/Kiritimati" : "Pacific/Pago_Pago";
  const context = await browser.newContext({baseURL: (await loadConfig()).ui.baseURL, timezoneId});
  try {
    const page = await context.newPage();
    expect(await page.evaluate(() => new Date().toLocaleDateString("sv")), timezoneId).not.toBe(dateOffset(0));
    await login(page, STAFF);
    await body(page);
  } finally {
    await context.close();
  }
}

meetingsLayer.describe((artifact) => {
  readOnlyTest(
    "a meeting keeps its date and time in a browser of another time zone",
    {tag: "@ui"},
    async ({browser, api}) => {
      const {todayMeeting} = artifact();
      await withFarTimeZonePage(api, browser, async (page) => {
        await openPage(
          page,
          `/${FACILITY.url}/calendar?${new URLSearchParams({mode: "day", date: todayMeeting.date})}`,
        );
        await resourceInput(page, "day", STAFF.name).check();
        const block = meetingBlocks(page, todayMeeting.id);
        await expect(block).toBeVisible();
        // The meeting's time is a time of day, the same in every time zone.
        await block.click();
        await expect(page.getByRole("heading", {name: /models\.meeting\._name/i})).toBeVisible();
        await expect(page.locator("#meeting_edit")).toContainText(/10:00( AM)?\s*–\s*11:00/);
        await page.getByRole("button", {name: "actions.edit"}).click();
        await expect(page.locator('#meeting_edit input[name="date"]')).toHaveValue(todayMeeting.date);
        await expect(page.locator('#meeting_edit input[name="time.startTime"]')).toHaveValue("10:00");
      });
    },
  );

  readOnlyTest(
    "calendar's today is the app's today in a browser of another time zone",
    {tag: "@ui"},
    async ({browser, api}) => {
      const {todayMeeting, pastMeeting, futureMeeting} = artifact();
      await withFarTimeZonePage(api, browser, async (page) => {
        await openPage(page, `/${FACILITY.url}/calendar?mode=day`);
        await resourceInput(page, "day", STAFF.name).check();
        // The day shown is the one with the meeting seeded for today.
        await expect(meetingBlocks(page, todayMeeting.id)).toBeVisible();
        await expect(page.locator("main").getByRole("button", {name: /^calendar\.today$/i})).toBeDisabled();
        await expect(meetingBlocks(page, pastMeeting.id).or(meetingBlocks(page, futureMeeting.id))).toHaveCount(0);
      });
    },
  );
});
