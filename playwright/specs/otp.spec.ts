import {DateTime} from "luxon";
import {loadConfig} from "../lib/config.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {createdId, expectValidationError, responseData} from "../lib/responses.ts";
import {expectFormSuccess, expectSectionShown, formField} from "../helpers/selectors.ts";
import {
  expect,
  login,
  MemoAPI,
  openPage,
  submitLoginFormWithThrottleRetry,
  submitLoginWithThrottleRetry,
  test,
} from "../lib/test.ts";
import {Totp} from "../lib/totp.ts";

/**
 * One-time passwords (TOTP). Every test works on a user of its own, created in the test: a
 * user left with OTP configured could not be logged in by the other tests.
 *
 * The backend accepts the code of the previous, the current and the next time step, but only one
 * of a later step than the last code used. The tests take the codes from the secret (`Totp`),
 * each one of the next unused step, so they need no waiting.
 *
 * The login endpoint is throttled (5 a minute), and the tests here log in a lot, so they wait
 * the throttle out and have a longer timeout.
 */
test.describe.configure({timeout: 240_000});

const PASSWORD = "OtpTestPass1!";

function userCreds(label: string) {
  return {name: `OTP Test ${label}`, email: `otp-${label}@test.pl`, password: PASSWORD} as const;
}

async function createUser(api: MemoAPI, creds: ReturnType<typeof userCreds>, fields: Record<string, unknown> = {}) {
  const globalAdminApi = await api.loggedInAs((await loadConfig()).ui.admin);
  const userId = await createdId(await globalAdminApi.createUser({...creds, hasEmailVerified: true, ...fields}));
  return {globalAdminApi, userId};
}

async function generateSecret(userApi: MemoAPI) {
  const res = await userApi.post("user/otp/generate", {password: PASSWORD});
  return await responseData<{otpSecret: string; validUntil: string}>(res);
}

/** Configures OTP for the user of the session. Returns the generator of the codes, one code used. */
async function configureOtp(userApi: MemoAPI) {
  const otp = new Totp((await generateSecret(userApi)).otpSecret);
  await userApi.post("user/otp/configure", {otp: otp.next()});
  return otp;
}

/** Returns the time the given number of hours from now, in the format of the API (no milliseconds). */
function isoTimeInHours(hours: number) {
  return DateTime.utc().plus({hours}).set({millisecond: 0}).toISO({suppressMilliseconds: true});
}

async function hasOtpConfigured(userApi: MemoAPI) {
  return (await userApi.getData<{user: {hasOtpConfigured: boolean}}>("user/status")).user.hasOtpConfigured;
}

test("OTP is configured with a valid code of a generated secret, once", async ({api}) => {
  const creds = userCreds("configure");
  await createUser(api, creds);
  const userApi = await api.loggedInAs(creds);
  expect(await hasOtpConfigured(userApi)).toBe(false);

  // No secret without the password, no configuring without a secret.
  const wrongPassword = await userApi.post("user/otp/generate", {password: "not-the-password"}, {allowFailure: true});
  await expectValidationError(wrongPassword, {field: "password", code: "validation.current_password"});
  const noSecret = await userApi.post("user/otp/configure", {otp: "123456"}, {allowFailure: true});
  expect(noSecret.status()).toBe(403);

  const {otpSecret, validUntil} = await generateSecret(userApi);
  expect(otpSecret).toMatch(/^[A-Z2-7]{32}$/);
  const otp = new Totp(otpSecret);
  // A minute, give or take what the clock of the server may differ by.
  const validMillis = DateTime.fromISO(validUntil).diffNow().toMillis();
  expect(validMillis).toBeGreaterThan(30_000);
  expect(validMillis).toBeLessThanOrEqual(70_000);

  const malformed = await userApi.post("user/otp/configure", {otp: "12345"}, {allowFailure: true});
  await expectValidationError(malformed, {field: "otp", code: "validation.digits"});
  // A code of a time step far from now. The secret stays for another try.
  const wrongCode = await userApi.post("user/otp/configure", {otp: otp.wrong()}, {allowFailure: true});
  expect(wrongCode.status()).toBe(401);
  expect(await hasOtpConfigured(userApi)).toBe(false);

  await userApi.post("user/otp/configure", {otp: otp.next()});
  expect(await hasOtpConfigured(userApi)).toBe(true);

  // Once configured, the user cannot replace the secret.
  const again = await userApi.post("user/otp/generate", {password: PASSWORD}, {allowFailure: true});
  expect(again.status()).toBe(403);
});

test("login of a user with OTP needs a code, a newer one than the last code used", async ({api}) => {
  const creds = userCreds("login");
  await createUser(api, creds);
  const otp = await configureOtp(await api.loggedInAs(creds));

  const noCode = await MemoAPI.attemptLogin(creds);
  expect(noCode.status).toBe(400);
  expect(noCode.errors).toContainEqual({field: "otp", code: "validation.present"});

  // The code that configured the OTP counts as used.
  expect((await MemoAPI.attemptLogin({...creds, otp: otp.last()})).status).toBe(401);

  expect((await MemoAPI.attemptLogin({...creds, otp: otp.next()})).status).toBe(200);
  expect((await MemoAPI.attemptLogin({...creds, otp: otp.last()})).status).toBe(401);
});

test("a user without OTP logs in without a code, until the deadline for configuring it", async ({api}) => {
  const creds = userCreds("deadline");
  const inAWeek = isoTimeInHours(7 * 24);
  const {globalAdminApi, userId} = await createUser(api, creds, {otpRequiredAt: inAWeek});

  expect((await MemoAPI.attemptLogin(creds)).status).toBe(200);
  const unexpectedCode = await MemoAPI.attemptLogin({...creds, otp: "123456"});
  expect(unexpectedCode.status).toBe(400);
  expect(unexpectedCode.errors).toContainEqual({field: "otp", code: "validation.prohibited"});

  await globalAdminApi.patch(`admin/user/${userId}`, {otpRequiredAt: isoTimeInHours(-1)});
  expect((await MemoAPI.attemptLogin(creds)).status).toBe(401);

  await globalAdminApi.patch(`admin/user/${userId}`, {otpRequiredAt: null});
  expect((await MemoAPI.attemptLogin(creds)).status).toBe(200);
});

test("global admin removes a user's OTP; it cannot be set for the user by the admin", async ({api}) => {
  const creds = userCreds("remove");
  const {globalAdminApi, userId} = await createUser(api, creds);
  const userApi = await api.loggedInAs(creds);

  const setByAdmin = await globalAdminApi.patch(`admin/user/${userId}`, {hasOtpConfigured: true}, {allowFailure: true});
  await expectValidationError(setByAdmin, {field: "hasOtpConfigured", code: "validation.declined"});

  await configureOtp(userApi);
  expect((await MemoAPI.attemptLogin(creds)).status).toBe(400);

  await globalAdminApi.patch(`admin/user/${userId}`, {hasOtpConfigured: false});
  expect(await hasOtpConfigured(userApi)).toBe(false);
  expect((await MemoAPI.attemptLogin(creds)).status).toBe(200);
});

test(
  "OTP is configured in the user settings, and then asked for by the login form",
  {tag: "@ui"},
  async ({page, api}) => {
    const creds = userCreds("ui");
    await createUser(api, creds);
    expect((await MemoAPI.attemptLogin(creds)).status).toBe(200);

    await openPage(page, "/login");
    await submitLoginFormWithThrottleRetry(page, creds.email, creds.password);
    const userSettings = page.locator("title=user_settings");
    await expect(userSettings).toBeVisible({timeout: 30_000});

    await userSettings.click();
    await page.getByRole("button", {name: /actions\.configure_otp/}).click();
    const secretResponse = page.waitForResponse((res) => res.url().endsWith("/user/otp/generate"));
    const generatePassword = page.locator('#otp_generate input[name="password"]');
    await generatePassword.fill(PASSWORD);
    await generatePassword.press("Enter");
    const otp = new Totp(((await (await secretResponse).json()) as {data: {otpSecret: string}}).data.otpSecret);
    await expect(page.getByText(/otp\.configure\.time_left/)).toBeVisible();

    // A wrong code leaves the form open; the right one is accepted with a space in the middle.
    const configureInput = page.locator('#otp_configure input[name="otp"]');
    await configureInput.fill(otp.wrong());
    await configureInput.press("Enter");
    await expect(page.getByText("exception.bad_credentials")).toBeVisible();
    await expect(configureInput).toBeVisible();
    const code = otp.next();
    await configureInput.fill(`${code.slice(0, 3)} ${code.slice(3)}`);
    await configureInput.press("Enter");
    await expectFormSuccess(page, "otp_configure");
    await expect(configureInput).toHaveCount(0);

    // The settings now say so, and have nothing to configure.
    await userSettings.click();
    await expect(page.getByText("otp.otp_is_configured")).toBeVisible();
    await page.getByRole("button", {name: "actions.log_out"}).click();
    await expect(formField(page, "email")).toBeVisible();

    // The form asks for the code after the password, and logs in as soon as the code is complete.
    const otpInput = page.locator('#login input[name="otp"]');
    await submitLoginFormWithThrottleRetry(page, creds.email, creds.password);
    await expectSectionShown(otpInput, true);
    await expect(formField(page, "password")).toBeDisabled();
    await submitLoginWithThrottleRetry(page, async () => {
      await otpInput.fill("");
      await otpInput.fill(otp.next());
    });
    await expect(userSettings).toBeVisible({timeout: 30_000});
  },
);

test(
  "a user with a deadline for OTP is prompted to configure it on every page load",
  {tag: "@ui"},
  async ({page, api}) => {
    const creds = userCreds("prompt");
    const {globalAdminApi, userId} = await createUser(api, creds, {otpRequiredAt: isoTimeInHours(7 * 24)});
    await login(page, creds);
    const modalTitle = page.getByRole("heading", {name: "forms.otp_configure.form_name"});
    const userSettings = page.locator("title=user_settings");
    const warningMark = userSettings.locator("svg.text-red-500");

    await test.step("the form opens by itself, saying that OTP is required", async () => {
      await openPage(page, "/help");
      await expect(modalTitle).toBeVisible();
      await expect(page.getByText("auth.otp_required")).toBeVisible();
      await expect(page.locator('#otp_generate input[name="password"]')).toBeVisible();
    });

    await test.step("dismissed, it leaves a mark on the settings, and comes back on the next load", async () => {
      await page.locator("#otp_generate").getByRole("button", {name: "actions.cancel"}).click();
      await expect(modalTitle).toHaveCount(0);
      await expect(warningMark).toBeVisible();
      await userSettings.click();
      await expect(
        page.getByRole("button", {name: /actions\.configure_otp/}).locator("svg.text-red-500"),
      ).toBeVisible();
      await page.reload();
      await disableTranslations(page);
      await expect(modalTitle).toBeVisible();
    });

    await test.step("no deadline, no prompt", async () => {
      await globalAdminApi.patch(`admin/user/${userId}`, {otpRequiredAt: null});
      await page.reload();
      await disableTranslations(page);
      await expect(userSettings).toBeVisible();
      await expect(warningMark).toHaveCount(0);
      await expect(modalTitle).toHaveCount(0);
    });
  },
);
