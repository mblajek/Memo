import {expect, type Locator, type Page} from "@playwright/test";
import {disableTranslations} from "./lang.ts";

export type CalendarMode = "day" | "week" | "month";

interface CalendarView {
  readonly mode: CalendarMode;
  /** A date (`YYYY-MM-DD`) the view should contain. */
  readonly date: string;
  /** The names of the staff members and meeting resources to select; one only outside the day view. */
  readonly resources: readonly string[];
}

/**
 * Opens the facility calendar on the given view, in the testing language. The mode and the date go
 * in the query string, which the calendar drops from the URL once applied; the resources are then
 * selected in the list. The calendar remembers its state in the browser, so on a second call in a
 * test the resources selected earlier stay selected.
 */
export async function openCalendar(page: Page, facilityUrl: string, {mode, date, resources}: CalendarView) {
  await page.goto(`/${facilityUrl}/calendar?${new URLSearchParams({mode, date})}`);
  await disableTranslations(page);
  await expectCalendarMode(page, mode);
  for (const name of resources) {
    await resourceInput(page, mode, name).check();
  }
}

/** The checkbox (day view) or radio button (other views) selecting a staff member or a resource. */
export function resourceInput(page: Page, mode: CalendarMode, name: string): Locator {
  return page.locator("main").getByRole(mode === "day" ? "checkbox" : "radio", {name, exact: true});
}

/**
 * Asserts that the calendar is in the given view. The view switcher does not expose its state, so
 * this goes by what differs between the views: the "today" button's label, and the resources
 * being selected with checkboxes in the day view and with radio buttons in the other ones.
 */
export async function expectCalendarMode(page: Page, mode: CalendarMode) {
  const main = page.locator("main");
  const todayKey = mode === "month" ? "this_month" : "today";
  await expect(main.getByRole("button", {name: new RegExp(`^calendar\\.${todayKey}$`, "i")})).toBeVisible();
  const resourceInputs = (type: string) => main.locator(`input[type="${type}"][id^="resourceSelected_"]`);
  await expect(resourceInputs(mode === "day" ? "checkbox" : "radio")).not.toHaveCount(0);
  await expect(resourceInputs(mode === "day" ? "radio" : "checkbox")).toHaveCount(0);
}

export async function switchCalendarMode(page: Page, mode: CalendarMode) {
  await page.locator("main").getByText(`calendar.units.${mode}`, {exact: true}).click();
  await expectCalendarMode(page, mode);
}

/** The blocks of the meeting in the calendar — one per column the meeting appears in. */
export function meetingBlocks(page: Page, meetingId: string): Locator {
  return page.locator(`main [data-entity-id="${meetingId}"]`);
}

/**
 * Opens the day of the meeting in the calendar of the staff member and clicks the meeting, which
 * opens its modal; returns the meeting form.
 */
export async function openMeetingModal(
  page: Page,
  facilityUrl: string,
  meeting: {readonly id: string; readonly date: string},
  staffName: string,
) {
  await openCalendar(page, facilityUrl, {mode: "day", date: meeting.date, resources: [staffName]});
  await meetingBlocks(page, meeting.id).click();
  await expect(page.getByRole("heading", {name: /models\.meeting\._name/i})).toBeVisible();
  return page.locator("#meeting_edit");
}

/** The buttons moving the calendar one page (day, week or month) back and forward. */
export function calendarPageButtons(page: Page) {
  const main = page.locator("main");
  return {prev: main.locator("title=Calendar.previous"), next: main.locator("title=Calendar.next")};
}

/**
 * Clicks the empty slot of the hours area that is `minutesAfterEnd` minutes below the end of the
 * given meeting block, in the block's column. The slot is found by geometry, with the block giving
 * the scale: its height is its duration.
 */
export async function clickSlotBelowMeeting(
  page: Page,
  block: Locator,
  {durationMinutes, minutesAfterEnd}: {durationMinutes: number; minutesAfterEnd: number},
) {
  await block.evaluate((element) => element.scrollIntoView({block: "center"}));
  await expect(block).toBeInViewport({ratio: 1});
  const box = (await block.boundingBox())!;
  const pixelsPerMinute = box.height / durationMinutes;
  // Aim a few pixels into the slot, away from the grid line.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + minutesAfterEnd * pixelsPerMinute + 8);
}
