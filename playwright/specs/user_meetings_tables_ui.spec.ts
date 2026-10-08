import {meetingsListTab, shownTableRows} from "../helpers/meetings.ts";
import type {Page} from "@playwright/test";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {expect, login, openPage, readOnlyTest} from "../lib/test.ts";

/**
 * The meetings tables at the bottom of the client and the staff details pages: the planned and
 * the completed meetings of the person, for a client with the counts in the tab labels. Meetings of
 * the system category (work and leave times, and the seeded "consult" type) are not counted nor listed.
 * Also the list of people related to a client by common meetings.
 */

const tab = meetingsListTab;

async function expectCounts(page: Page, {planned, completed}: {planned: number; completed: number}) {
  await expect(tab(page, "planned")).toContainText(new RegExp(`meetings_lists\\.planned — ${planned}(\\D|$)`, "i"));
  await expect(tab(page, "completed")).toContainText(
    new RegExp(`meetings_lists\\.completed — ${completed}(\\D|$)`, "i"),
  );
}

const rows = shownTableRows;

async function openDetails(page: Page, path: string) {
  await openPage(page, `/${FACILITY.url}/${path}`);
}

meetingsLayer.describe((artifact) => {
  readOnlyTest("client details list the client's planned and completed meetings", {tag: "@ui"}, async ({page}) => {
    const {adultClientInfos} = artifact();
    const [adam, , carl, diana, eve] = adultClientInfos;
    await login(page, STAFF);

    await openDetails(page, `clients/${carl!.id}`);
    await expectCounts(page, {planned: 1, completed: 0});
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page)).toContainText(["dictionary.meetingType.other"]);

    await openDetails(page, `clients/${adam!.id}`);
    await expectCounts(page, {planned: 0, completed: 1});
    await expect(rows(page)).toHaveCount(0);
    await tab(page, "completed").click();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page)).toContainText(["dictionary.meetingStatus.completed"]);

    await openDetails(page, `clients/${diana!.id}`);
    await expectCounts(page, {planned: 1, completed: 0});
    await expect(rows(page)).toContainText(["Integration Test Therapy"]);

    // Eve attends only the meeting of the system category.
    await openDetails(page, `clients/${eve!.id}`);
    await expectCounts(page, {planned: 0, completed: 0});
    await tab(page, "all").click();
    await expect(tab(page, "all")).toHaveAttribute("aria-selected", "true");
    await expect(rows(page)).toHaveCount(0);
  });

  readOnlyTest("staff details list the staff member's planned and completed meetings", {tag: "@ui"}, async ({page}) => {
    const {staffUserId} = artifact();
    await login(page, STAFF);
    await openDetails(page, `staff/${staffUserId}`);
    // Today's, next week's and the group meeting; the past one is completed. No counts here.
    await expect(tab(page, "planned")).toHaveAttribute("aria-selected", "true");
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).filter({hasText: "Integration Test Therapy"})).toHaveCount(1);
    await tab(page, "completed").click();
    await expect(rows(page)).toHaveCount(1);
    await tab(page, "all").click();
    await expect(rows(page)).toHaveCount(4);
    await expect(rows(page).filter({hasText: "Integration Test Consult"})).toHaveCount(0);
  });

  readOnlyTest("client details list the people the client had meetings with", {tag: "@ui"}, async ({page}) => {
    const {adultClientInfos, childClientInfos, staffUserId, staffAdminUserId} = artifact();
    const [adam, , , diana] = adultClientInfos;
    const [zoe, will] = childClientInfos;
    await login(page, STAFF);
    // Diana's only meeting is the group one: two staff members and two other clients.
    await openDetails(page, `clients/${diana!.id}`);
    const link = (type: "staff" | "clients", userId: string) =>
      page.locator(`a[href="/${FACILITY.url}/${type}/${userId}"]`);
    const section = page
      .locator("div")
      .filter({hasText: "facility_user.related_users"})
      .filter({has: link("staff", staffUserId)})
      .last();
    await expect(section).toContainText(STAFF.name);
    for (const [type, userId] of [
      ["staff", staffUserId],
      ["staff", staffAdminUserId],
      ["clients", zoe!.id],
      ["clients", will!.id],
    ] as const) {
      await expect(section.locator(link(type, userId)).first()).toBeVisible();
    }
    // One meeting with each of the four.
    await expect(section.getByText("parenthesised{text:1}")).toHaveCount(4);
    // Neither the client themselves nor a client of other meetings.
    await expect(section.locator(link("clients", diana!.id))).toHaveCount(0);
    await expect(section.locator(link("clients", adam!.id))).toHaveCount(0);
  });
});
