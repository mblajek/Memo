import {DateTime} from "luxon";
import fs from "node:fs";
import path from "node:path";
import {E2E_ROOT} from "./config.ts";
import "./init_luxon.ts";

/**
 * The date `dayOffset` days from today, as `YYYY-MM-DD`. "Today" is the local date of the machine
 * running the tests — the same one the browser, and so the app's UI, goes by.
 */
export function dateOffset(dayOffset: number): string {
  return DateTime.now().plus({days: dayOffset}).toISODate();
}

/** The date `days` days after the given one (`YYYY-MM-DD`). */
export function addDays(date: string, days: number): string {
  return DateTime.fromISO(date).plus({days}).toISODate();
}

/** The Monday of the week containing the given date (`YYYY-MM-DD`). */
export function mondayOf(date: string): string {
  return DateTime.fromISO(date).startOf("week", {useLocaleWeeks: false}).toISODate();
}

/** The Monday of the week `weekOffset` weeks from the current one. */
function weekStart(weekOffset: number): string {
  return addDays(mondayOf(dateOffset(0)), 7 * weekOffset);
}

/** The file of the app's source that lists the public holidays it knows. */
export const APP_HOLIDAYS_FILE = path.join(E2E_ROOT, "../resources/js/components/ui/calendar/holidays.ts");

/**
 * The public holidays the app knows (`YYYY-MM-DD`), read from the app's source, where they are
 * listed.
 */
function appHolidays(): ReadonlySet<string> {
  const source = fs.readFileSync(APP_HOLIDAYS_FILE, "utf8");
  const holidays = new Set(Array.from(source.matchAll(/^\s*"(\d{4}-\d{2}-\d{2})",/gm), (match) => match[1]!));
  if (!holidays.size) {
    throw new Error("No holidays found in the app's holidays.ts");
  }
  return holidays;
}

export function isAppHoliday(date: string) {
  return appHolidays().has(date);
}

/** The first of the public holidays the app knows that is not before the date. */
export function firstAppHolidayFrom(date: string) {
  const holiday = [...appHolidays()].toSorted().find((h) => h >= date);
  if (!holiday) {
    throw new Error(`The app knows no holiday from ${date} on: its list of holidays needs more years`);
  }
  return holiday;
}

/**
 * The Monday of the first week, from the week after the current one on, that starts `weekCount`
 * weeks without a public holiday.
 */
export function holidayFreeWeekStart(weekCount: number): string {
  const holidays = appHolidays();
  const isFree = (monday: string) =>
    Array.from({length: 7 * weekCount}, (_, i) => addDays(monday, i)).every((date) => !holidays.has(date));
  for (let weekOffset = 1; weekOffset <= 52; weekOffset++) {
    const monday = weekStart(weekOffset);
    if (isFree(monday)) {
      return monday;
    }
  }
  throw new Error(`No ${weekCount} weeks without a holiday in the coming year`);
}
