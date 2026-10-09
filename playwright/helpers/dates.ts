import {DateTime} from "luxon";

/** The locale the browsers of the tests run in. */
export const BROWSER_LOCALE = "pl-PL";

/** How many days from now the moment is: an ISO time, or the value of a local time input. */
export function daysFromNow(time: string) {
  return DateTime.fromISO(time).diffNow("days").days;
}

/** A date as the pages and the exports have it, like 29.02.2024. */
export function shownDate(isoDate: string) {
  return DateTime.fromISO(isoDate).toFormat("dd.MM.yyyy");
}

/** A date as the details of a record show it: after the name of its weekday. */
export function shownDateWithWeekday(isoDate: string) {
  return `${DateTime.fromISO(isoDate).setLocale(BROWSER_LOCALE).toFormat("cccc")}, ${shownDate(isoDate)}`;
}

/** A date as a table cell shows it in the testing language: after the key of its weekday. */
export function shownTableDate(isoDate: string) {
  const weekday = DateTime.fromISO(isoDate).setLocale(BROWSER_LOCALE).toFormat("ccc");
  return `calendar.weekday_overrides.${weekday} , ${shownDate(isoDate)}`;
}

/** A moment as the pages and the exports have it, to the second, in this machine's time zone. */
export function shownDateTime(isoTime: string) {
  return DateTime.fromISO(isoTime).toFormat("dd.MM.yyyy, HH:mm:ss");
}

/** A time of some day as a table cell shows it, like a date, to the second. */
export const SHOWN_TABLE_TIME = /^calendar\.weekday_overrides\.\S+ , \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}$/;

/** A time as an export of a table has it. */
export const EXPORTED_TIME = /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}$/;
