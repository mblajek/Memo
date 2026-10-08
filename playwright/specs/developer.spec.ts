import {expect, MemoAPI, openPage, test} from "../lib/test.ts";

const DEV_ADMIN = {name: "Developer Test Admin", email: "developer-admin@test.pl", password: "DevAdminPass1!"} as const;

async function hasDeveloperPermission(api: MemoAPI) {
  return (await api.getData<{permissions: {developer: boolean}}>("user/status")).permissions.developer;
}

/**
 * The developer permission is a flag on the session of a global admin, switched by a `developer`
 * field sent to the login endpoint. The UI has no control to turn it on, just a
 * `developerLogin()` function exposed on `window`; turning it off is in the header.
 *
 * Runs on a global admin of its own: the shared admin's session is cached and reused by other
 * tests, and a developer flag left on it by a failure here would change what they see.
 */
test(
  "global admin turns the developer permission on and off",
  {tag: "@ui"},
  async ({page, pageApi, globalAdminApi}) => {
    await globalAdminApi.createUser({...DEV_ADMIN, hasEmailVerified: true, hasGlobalAdmin: true});

    await openPage(page, "/help", DEV_ADMIN);
    const developerButton = page.locator("title=Developer permission");
    await expect(page.locator("title=user_settings")).toBeVisible();
    await expect(developerButton).toHaveCount(0);
    expect(await hasDeveloperPermission(pageApi)).toBe(false);

    await page.waitForFunction(() => "developerLogin" in window);
    await page.evaluate(() => (window as unknown as {developerLogin(developer: boolean): void}).developerLogin(true));
    await expect(developerButton).toBeVisible();
    expect(await hasDeveloperPermission(pageApi)).toBe(true);
    // The developer-only pages show up in the sidebar.
    await expect(page.getByRole("navigation").locator('a[href="/dev/logs"]')).toBeVisible();

    await developerButton.click();
    await page.getByRole("button", {name: "Developer logout"}).click();
    await expect(developerButton).toHaveCount(0);
    expect(await hasDeveloperPermission(pageApi)).toBe(false);
    await expect(page.getByRole("navigation").locator('a[href="/dev/logs"]')).toHaveCount(0);
  },
);
