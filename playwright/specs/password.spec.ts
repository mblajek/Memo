import {loadConfig} from "../lib/config.ts";
import {expect, MemoAPI, openPage, readOnlyTest, submitLoginFormWithThrottleRetry, test} from "../lib/test.ts";
import type {Page} from "@playwright/test";
import {formField} from "../helpers/selectors.ts";

/**
 * UI-level password change tests.
 *
 * Tests that don't mutate (validation failures) reuse cfg.ui.admin via the session cache so they
 * don't burn through the `throttle:5,1,api_login` rate limit. Only the happy-path test creates a
 * fresh user and triggers real /user/login hits.
 */

const ORIGINAL = "OriginalPass1!";
const NEW = "NewPass456!";

async function createUser(globalAdminApi: MemoAPI, email: string, password: string) {
  await globalAdminApi.createUser({
    name: `Password Test User ${email}`,
    email,
    hasEmailVerified: true,
    password,
    hasGlobalAdmin: true,
  });
}

async function logInViaUI(page: Page, email: string, password: string) {
  await openPage(page, "/login");
  await submitLoginFormWithThrottleRetry(page, email, password);
  await expect(page.locator("title=user_settings")).toBeVisible();
}

async function logInAsAdminAndOpenAnyPage(page: Page) {
  const cfg = await loadConfig();
  await openPage(page, "/help", cfg.ui.admin);
}

async function openPasswordChangeModal(page: Page) {
  await page.locator("title=user_settings").click();
  await page.getByRole("button", {name: "actions.change_password"}).click();
}

test("change password via UI: happy path; new password works", {tag: "@ui"}, async ({page, globalAdminApi}) => {
  const email = "pw-happy@test.pl";
  await createUser(globalAdminApi, email, ORIGINAL);
  await logInViaUI(page, email, ORIGINAL);

  await openPasswordChangeModal(page);
  await formField(page, "current").fill(ORIGINAL);
  await formField(page, "password").fill(NEW);
  const repeat = formField(page, "repeat");
  await repeat.fill(NEW);
  await repeat.press("Enter");
  // Modal closes on success — the current/password/repeat fields disappear.
  await expect(formField(page, "current")).toHaveCount(0);

  expect((await MemoAPI.attemptLogin({email, password: NEW})).status).toBe(200);
});

readOnlyTest("change password via UI: wrong current shows validation", {tag: "@ui"}, async ({page}) => {
  await logInAsAdminAndOpenAnyPage(page);
  await openPasswordChangeModal(page);
  await formField(page, "current").fill("definitely-wrong");
  await formField(page, "password").fill(NEW);
  const repeat = formField(page, "repeat");
  await repeat.fill(NEW);
  await repeat.press("Enter");
  await expect(page.getByText("validation.current_password")).toBeVisible();
  await expect(formField(page, "current")).toBeVisible();
});

readOnlyTest("change password via UI: repeat mismatch shows validation", {tag: "@ui"}, async ({page}) => {
  await logInAsAdminAndOpenAnyPage(page);
  await openPasswordChangeModal(page);
  const cfg = await loadConfig();
  await formField(page, "current").fill(cfg.ui.admin.password);
  await formField(page, "password").fill(NEW);
  const repeat = formField(page, "repeat");
  await repeat.fill(`${NEW}-different`);
  await repeat.press("Enter");
  await expect(page.getByText("validation.same")).toBeVisible();
  await expect(formField(page, "repeat")).toBeVisible();
});

readOnlyTest("change password via UI: weak password shows validation", {tag: "@ui"}, async ({page}) => {
  await logInAsAdminAndOpenAnyPage(page);
  await openPasswordChangeModal(page);
  const cfg = await loadConfig();
  await formField(page, "current").fill(cfg.ui.admin.password);
  await formField(page, "password").fill("short");
  const repeat = formField(page, "repeat");
  await repeat.fill("short");
  await repeat.press("Enter");
  // The Password rule renders sub-errors keyed under validation.password.*
  await expect(page.locator("text=/validation\\.password\\./").first()).toBeVisible();
  await expect(formField(page, "password")).toBeVisible();
});
