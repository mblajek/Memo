import {expect, type Locator, type Page} from "@playwright/test";
import {addDays} from "../lib/dates.ts";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import type {MeetingInfo} from "../lib/layers/meetings.ts";
import {meetingBlocks, openMeetingModal} from "./calendar.ts";
import {expectFormSuccess, submitButton, tableRows} from "./selectors.ts";

/**
 * Returns the function giving the date `offset` days from the day the meetings of the layer were
 * seeded on — they are relative to it.
 */
export function seededDays(artifact: () => {readonly todayMeeting: {readonly date: string}}) {
  return (offset: number) => addDays(artifact().todayMeeting.date, offset);
}

export const viewHeading = (page: Page) => page.getByRole("heading", {name: /models\.meeting\._name/i});
export const editHeading = (page: Page) => page.getByRole("heading", {name: "forms.meeting_edit.form_name"});

/**
 * Opens the meeting's modal from its block in the day view of the calendar. The meeting must have
 * the logged in user (STAFF) among its staff.
 */
export function openMeeting(page: Page, meeting: Pick<MeetingInfo, "id" | "date">) {
  return openMeetingModal(page, FACILITY.url, meeting, STAFF.name);
}

/** Opens again, from its block in the calendar, the meeting whose modal was closed. */
export async function reopenMeeting(page: Page, meeting: Pick<MeetingInfo, "id">) {
  await meetingBlocks(page, meeting.id).first().click();
  await expect(viewHeading(page)).toBeVisible();
}

export async function startEditing(page: Page) {
  await page.getByRole("button", {name: "actions.edit"}).click();
  await expect(editHeading(page)).toBeVisible();
}

export async function saveEdit(page: Page) {
  await submitButton(page, "meeting_edit").click();
  await expectFormSuccess(page, "meeting_edit");
  await expect(editHeading(page)).toHaveCount(0);
}

/** The dates ticked in the list of the dates of a series, in a form making one. */
export async function checkedSeriesDates(form: Locator) {
  const names = await form
    .locator('input[name^="seriesIncludeDate."]:checked')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).name));
  return names.map((name) => name.replace("seriesIncludeDate.", ""));
}

/** The tab of the lists of a person's meetings: the planned ones, the completed ones, or all. */
export function meetingsListTab(page: Page, name: "planned" | "completed" | "all") {
  return page.getByRole("tab", {name: new RegExp(`facility_user\\.meetings_lists\\.${name}`, "i")});
}

/** The rows of the table of the selected tab. The tables of the tabs seen before stay in the DOM. */
export function shownTableRows(page: Page) {
  return tableRows(page.locator("main"), /\S/).locator("visible=true");
}
