import {loadConfig} from "../lib/config.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {expect, MemoAPI, openPage, readOnlyTest, submitLoginFormWithThrottleRetry, test} from "../lib/test.ts";

readOnlyTest("login with bad credentials shows error", {tag: "@ui"}, async ({page}) => {
  const cfg = await loadConfig();
  await openPage(page, "/");

  await submitLoginFormWithThrottleRetry(page, cfg.ui.admin.email, "definitely-not-the-password");

  // Order matters: end on the positive assertion so the test can't pass trivially if the page
  // didn't render (a bare not.toBeVisible passes when the element doesn't exist for any reason).
  await expect(page.locator("title=user_settings")).not.toBeVisible();
  await expect(page.getByText("exception.bad_credentials")).toBeVisible();
});

readOnlyTest("login with empty email shows validation", {tag: "@ui"}, async ({page}) => {
  const cfg = await loadConfig();
  await openPage(page, "/");

  // Browser HTML5 validation blocks submission with an empty email, so this never reaches the
  // server — no throttle concern here.
  const password = page.locator('input[name="password"]');
  await password.fill(cfg.ui.admin.password);
  await password.press("Enter");

  // Negative-then-positive: the positive `toBeFocused` confirms we're still on the login form
  // (HTML5 validation moved focus to the missing field) — guards against the negative
  // assertion passing trivially because the page navigated away.
  await expect(page.locator("title=user_settings")).not.toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeFocused();
});

readOnlyTest("persisted email pre-fills on next login", {tag: "@ui"}, async ({page}) => {
  const cfg = await loadConfig();
  await openPage(page, "/");

  await submitLoginFormWithThrottleRetry(page, cfg.ui.admin.email, cfg.ui.admin.password);
  await expect(page.locator("title=user_settings")).toBeVisible();

  await page.locator("title=user_settings").click();
  await page.getByRole("button", {name: "actions.log_out"}).click();
  await expect(page.locator('input[name="email"]')).toHaveValue(cfg.ui.admin.email);
});

readOnlyTest("theme chosen on the login form persists across reloads", {tag: "@ui"}, async ({page}) => {
  await openPage(page, "/");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/\bdark\b/);

  await page.locator("title=switch_theme").click();
  await expect(html).toHaveClass(/\bdark\b/);

  await page.reload();
  await disableTranslations(page);
  // Positive guard that the login form is back before looking at the theme.
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(html).toHaveClass(/\bdark\b/);
});

/**
 * The login endpoint lets five requests a minute through (`throttle:5,1,api_login`), counted per
 * address for callers who are not logged in, whatever the account and the outcome. The test
 * leaves the throttle exhausted: the logins of the tests after it get past it by themselves.
 */
test("login is throttled after five attempts in a minute", async () => {
  const anonymousApi = await MemoAPI.spawn();
  try {
    const attempt = () =>
      anonymousApi.post(
        "user/login",
        {email: "no-such-user@test.pl", password: "definitely-not-the-password"},
        {allowFailure: true},
      );
    // Earlier logins of the run count too, so some of these may be throttled already.
    for (let i = 0; i < 5; i++) {
      expect([401, 429]).toContain((await attempt()).status());
    }
    const throttled = await attempt();
    expect(throttled.status()).toBe(429);
    expect(Number(throttled.headers()["retry-after"])).toBeGreaterThan(0);
    expect(Number(throttled.headers()["retry-after"])).toBeLessThanOrEqual(60);
  } finally {
    await anonymousApi.dispose();
  }
});
