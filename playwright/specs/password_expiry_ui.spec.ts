import {DateTime} from "luxon";
import type {Page} from "@playwright/test";
import {FACILITY, STAFF, facilityLayer} from "../lib/layers/facility.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {expect, login, MemoAPI, openPage, submitLoginFormWithThrottleRetry, test} from "../lib/test.ts";
import {formField} from "../helpers/selectors.ts";

/**
 * The prompt to change a password that expires soon: suggested from 20 days before the expiry,
 * forced from 7 days. An expired password no longer logs in.
 */

function inDays(days: number) {
  return DateTime.utc().plus({days}).set({millisecond: 0}).toISO({suppressMilliseconds: true});
}

const modalTitle = (page: Page) => page.getByRole("heading", {name: /forms\.password_change\.form_name/i});
const settingsButton = (page: Page) => page.locator("title=user_settings");
const warningMark = (page: Page) => settingsButton(page).locator('[data-role="settings-warning"]');

async function openCalendar(page: Page) {
  await openPage(page, `/${FACILITY.url}/calendar`);
  await expect(settingsButton(page)).toBeVisible();
}

facilityLayer.describe((artifact) => {
  test(
    "a password about to expire: change suggested, then forced; expired, it does not log in",
    {tag: "@ui"},
    async ({page, browser, globalAdminApi}) => {
      const {staffUserId} = artifact();
      const setExpiry = (days: number) =>
        globalAdminApi.patch(`admin/user/${staffUserId}`, {passwordExpireAt: inDays(days)});
      await login(page, STAFF);

      await test.step("a month ahead: no prompt", async () => {
        await setExpiry(30);
        await openCalendar(page);
        await expect(warningMark(page)).toHaveCount(0);
        await expect(modalTitle(page)).toHaveCount(0);
      });

      await test.step("two weeks ahead: the change is suggested and can be dismissed", async () => {
        await setExpiry(14);
        await openCalendar(page);
        await expect(modalTitle(page)).toBeVisible();
        await expect(page.getByText("auth.password_expiration_soon")).toBeVisible();
        await page.getByRole("button", {name: "actions.cancel"}).click();
        await expect(modalTitle(page)).toBeHidden();
        await expect(warningMark(page)).toBeVisible();
        // The user menu opens the same form, with the warning.
        await settingsButton(page).click();
        await page.getByRole("button", {name: "actions.change_password"}).click();
        await expect(page.getByText("auth.password_expiration_soon")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(modalTitle(page)).toBeHidden();
      });

      await test.step("three days ahead: the form cannot be dismissed, only logging out is offered", async () => {
        await setExpiry(3);
        await openCalendar(page);
        await expect(modalTitle(page)).toBeVisible();
        await expect(page.getByRole("button", {name: "actions.log_out"})).toBeVisible();
        await expect(page.getByRole("button", {name: "actions.cancel"})).toHaveCount(0);
        await expect(page.getByRole("button", {name: "actions.close"})).toHaveCount(0);
        await page.keyboard.press("Escape");
        await expect(formField(page, "current")).toBeVisible();
        await expect(modalTitle(page)).toBeVisible();
      });

      await test.step("expired: logging in is refused as bad credentials", async () => {
        await setExpiry(-1);
        const context = await browser.newContext();
        try {
          const loginPage = await context.newPage();
          await loginPage.goto("/login");
          await disableTranslations(loginPage);
          await submitLoginFormWithThrottleRetry(loginPage, STAFF.email, STAFF.password);
          await expect(loginPage.getByText("exception.bad_credentials")).toBeVisible();
          await expect(settingsButton(loginPage)).toHaveCount(0);
        } finally {
          await context.close();
        }
      });
    },
  );

  test(
    "the forced password change form logs out, or changes the password and lets the user in",
    {tag: "@ui"},
    async ({page, globalAdminApi}) => {
      const {staffUserId} = artifact();
      await globalAdminApi.patch(`admin/user/${staffUserId}`, {passwordExpireAt: inDays(3)});
      const newPassword = "ForcedChange1!";

      // The form is used as soon as it shows, while the calendar under it is still loading: neither
      // the logout nor the new password may be undone by the requests still running.
      const openForcedForm = async () => {
        await login(page, STAFF);
        await openCalendar(page);
        await expect(modalTitle(page)).toBeVisible();
      };

      await test.step("the log-out button of the form", async () => {
        await openForcedForm();
        await page.getByRole("button", {name: "actions.log_out"}).click();
        await expect(formField(page, "email")).toBeVisible();
        await expect(modalTitle(page)).toHaveCount(0);
      });

      await test.step("a changed password ends the prompt", async () => {
        await openForcedForm();
        await formField(page, "current").fill(STAFF.password);
        await formField(page, "password").fill(newPassword);
        const repeat = formField(page, "repeat");
        await repeat.fill(newPassword);
        await repeat.press("Enter");
        await expect(modalTitle(page)).toHaveCount(0);
        await expect(page.locator("main").getByRole("button", {name: /^calendar\.today$/i})).toBeVisible();
        await expect(warningMark(page)).toHaveCount(0);
        // Not asked again.
        await openCalendar(page);
        await expect(page.locator("main").getByRole("button", {name: /^calendar\.today$/i})).toBeVisible();
        await expect(modalTitle(page)).toHaveCount(0);
      });

      expect((await MemoAPI.attemptLogin({email: STAFF.email, password: newPassword})).status).toBe(200);
      expect((await MemoAPI.attemptLogin(STAFF)).status).toBe(401);
    },
  );
});
