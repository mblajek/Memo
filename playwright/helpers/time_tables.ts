import type {Locator, Page} from "@playwright/test";
import {FACILITY} from "../lib/layers/facility.ts";
import {openPage} from "../lib/test.ts";

/**
 * The summaries of the calendar entries of the type with the given hours ("9:00–15:00"). Whether
 * an hour before 10 gets a leading zero is up to the browser.
 */
export function entrySummary(main: Locator, type: "work_time" | "facility_work_time", hours: string) {
  return main.locator(
    [hours, hours.replace(/\b\d:/g, "0$&")].map((h) => `[aria-description$="${type}} ${h}" i]`).join(", "),
  );
}

/**
 * The admin's time tables calendar, on the view (by default of the week) of the given staff
 * member.
 */
export async function openTimeTablesCalendar(
  page: Page,
  date: string,
  staffId: string,
  mode: "day" | "week" | "month" = "week",
) {
  await openPage(page, `/${FACILITY.url}/admin/time-tables?${new URLSearchParams({mode, date, resources: staffId})}`);
  const main = page.locator("main");
  return {
    main,
    /** The summaries (in the area above the hours) of the entries with the given hours. */
    summary: (type: "work_time" | "facility_work_time", hours: string) => entrySummary(main, type, hours),
    /** The "add" buttons, one per day column: Monday to Friday. */
    add: (weekday: number) => main.locator("title=actions.add").nth(weekday),
  };
}
