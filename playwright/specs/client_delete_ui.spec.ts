import type {Page} from "@playwright/test";
import {ADMIN, FACILITY, STAFF} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {chooseInFormSelect, expectSectionShown, submitButton} from "../helpers/selectors.ts";
import {expect, openPage, readOnlyTest, test} from "../lib/test.ts";
import {meetingClientIds, clientExists} from "../helpers/queries.ts";

/**
 * The client delete modal of the client details page. A client with meetings can only be deleted
 * as a duplicate of another client, and the form then demands that client.
 */

const activateButton = (page: Page) => page.getByRole("button", {name: "forms.client_delete.activate_button"});
/**
 * Opens the delete modal of the client, once the page shows the given number of planned meetings:
 * the form knows from the start that a duplicate-of client is needed only if the page had the
 * client's meetings counted by then.
 */
async function openDeleteModal(page: Page, clientId: string, {plannedMeetings}: {plannedMeetings: number}) {
  await openPage(page, `/${FACILITY.url}/clients/${clientId}`, ADMIN);
  await expect(
    page.getByRole("tab", {name: new RegExp(`meetings_lists\\.planned — ${plannedMeetings}( |$)`)}),
  ).toBeVisible();
  await activateButton(page).click();
  await expect(page.getByRole("heading", {name: /forms\.client_delete\.form_name/i})).toBeVisible();
}

const chooseDuplicateOf = (page: Page, clientName: string) => chooseInFormSelect(page, "duplicateOf", clientName);

meetingsLayer.describe((artifact) => {
  test("the admin deletes a client with no meetings in the modal", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, childClientInfos} = artifact();
    const xander = childClientInfos[3]!;
    await openDeleteModal(page, xander.id, {plannedMeetings: 0});
    await expectSectionShown(page.getByText("forms.client_delete.form_info.duplicate_of_info.optional"), true);
    await expectSectionShown(page.getByText("forms.client_delete.form_info.duplicate_of_info.required"), false);
    // The submit stays disabled for a few seconds, for the warning to be read.
    await expect(submitButton(page, "client_delete")).toBeDisabled();
    await submitButton(page, "client_delete").click();

    await expect(page.getByText("forms.client_delete.success.remove")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients$`));
    const adminApi = await api.loggedInAs(ADMIN);
    expect(await clientExists(adminApi, facilityId, xander.id)).toBe(false);
  });

  test(
    "a client with meetings is deleted in the modal as a duplicate, the meeting moves",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, adultClientInfos, childClientInfos, futureMeeting} = artifact();
      // Carl attends the future meeting; Violet attends none.
      const carl = adultClientInfos[2]!;
      const violet = childClientInfos[4]!;
      await openDeleteModal(page, carl.id, {plannedMeetings: 1});
      await expectSectionShown(page.getByText("forms.client_delete.form_info.duplicate_of_info.required"), true);
      await expectSectionShown(page.getByText("forms.client_delete.form_info.duplicate_of_info.optional"), false);

      await test.step("the client cannot be a duplicate of themselves", async () => {
        await chooseDuplicateOf(page, carl.name);
        await expect(page.getByText("forms.client_delete.form_info.duplicate_of_is_same")).toBeVisible();
        await expect(submitButton(page, "client_delete")).toBeDisabled();
      });

      await chooseDuplicateOf(page, violet.name);
      await expect(page.getByText("forms.client_delete.form_info.duplicate_of_is_same")).toBeHidden();
      await submitButton(page, "client_delete").click();

      await expect(page.getByText("forms.client_delete.success.deduplicate")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients/${violet.id}$`));
      const adminApi = await api.loggedInAs(ADMIN);
      expect(await clientExists(adminApi, facilityId, carl.id)).toBe(false);
      expect(await clientExists(adminApi, facilityId, violet.id)).toBe(true);
      expect(await meetingClientIds(adminApi, facilityId, futureMeeting.id)).toEqual([violet.id]);
    },
  );

  readOnlyTest("cancelling the client delete modal keeps the client", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, childClientInfos} = artifact();
    const yara = childClientInfos[2]!;
    await openDeleteModal(page, yara.id, {plannedMeetings: 0});
    await page.getByRole("button", {name: "actions.cancel"}).click();
    await expect(page.getByRole("heading", {name: /forms\.client_delete\.form_name/i})).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/clients/${yara.id}$`));
    const adminApi = await api.loggedInAs(ADMIN);
    expect(await clientExists(adminApi, facilityId, yara.id)).toBe(true);
  });

  readOnlyTest("staff without the admin role have no client delete button", {tag: "@ui"}, async ({page}) => {
    const {childClientInfos} = artifact();
    await openPage(page, `/${FACILITY.url}/clients/${childClientInfos[2]!.id}`, STAFF);
    // The edit button sits next to where the delete button would be.
    await expect(page.getByRole("button", {name: "actions.edit"}).first()).toBeVisible();
    await expect(activateButton(page)).toHaveCount(0);
  });
});
