import type {Page} from "@playwright/test";
import {FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {OTHER_FACILITY, secondFacilityLayer} from "../lib/layers/second_facility.ts";
import {createdId} from "../lib/responses.ts";
import {expect, login, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * Details pages opened with an id that is unknown, of a wrong kind, or of another facility: the
 * page says the resource was not found, inside the facility's normal layout.
 */

const UNKNOWN_ID = "0a0b0c0d-1111-4222-8333-444455556666";

async function expectNotFound(page: Page, path: string) {
  await openPage(page, `/${FACILITY.url}/${path}`);
  await expect(page.locator("main").getByRole("heading", {name: "errors.resource_not_found.title"})).toBeVisible();
  // The rest of the app is in place.
  await expect(page.getByRole("banner").getByText(FACILITY.name)).toBeVisible();
  await expect(page.getByRole("navigation").getByText("routes.facility.clients", {exact: true})).toBeVisible();
}

secondFacilityLayer.describe((artifact) => {
  readOnlyTest(
    "client and staff details of an unknown id, or of a user of another kind, are not found",
    {tag: "@ui"},
    async ({page}) => {
      const {staffUserId, bareMemberUserId} = artifact();
      await login(page, STAFF);
      await expectNotFound(page, `clients/${UNKNOWN_ID}`);
      await expectNotFound(page, `staff/${UNKNOWN_ID}`);
      // A staff member is not a client; a member with no role is not a staff member.
      await expectNotFound(page, `clients/${staffUserId}`);
      await expectNotFound(page, `staff/${bareMemberUserId}`);
    },
  );

  readOnlyTest("client details of a malformed id are not found", {tag: "@ui"}, async ({page}) => {
    await login(page, STAFF);
    await expectNotFound(page, "clients/not-an-id");
  });

  test(
    "a client of another facility is not found under this facility's URL",
    {tag: "@ui"},
    async ({page, api, browser}) => {
      const {otherFacilityId} = artifact();
      const staffAdminApi = await api.loggedInAs(STAFF_ADMIN);
      const {clientType} = await staffAdminApi.dictionaries();
      const foreign = {name: "Foreign Client of the Other Facility"};
      const foreignId = await createdId(
        await staffAdminApi.createFacilityClient(otherFacilityId, {
          ...foreign,
          client: {typeDictId: clientType!.adult!},
        }),
      );

      await test.step("for a member of both facilities", async () => {
        await openPage(page, `/${OTHER_FACILITY.url}/clients/${foreignId}`, STAFF_ADMIN);
        await expect(page.locator("main").getByText(foreign.name).first()).toBeVisible();
        await expectNotFound(page, `clients/${foreignId}`);
        await expect(page.getByText(foreign.name)).toHaveCount(0);
      });

      await test.step("for a member of this facility only", async () => {
        const context = await browser.newContext();
        try {
          const staffPage = await context.newPage();
          await login(staffPage, STAFF);
          await expectNotFound(staffPage, `clients/${foreignId}`);
          await expect(staffPage.getByText(foreign.name)).toHaveCount(0);
        } finally {
          await context.close();
        }
      });
    },
  );
});
