import {dateTimeToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";

/** Converts a DateTime to the string usable as value of <input type="datetime-local">. */
export function dateTimeToDateTimeLocal(dateTime: DateTime) {
  return dateTime.toLocal().set({second: 0, millisecond: 0}).toISO({includeOffset: false, suppressSeconds: true});
}

/** Converts the ISO time to the string usable as value of <input type="datetime-local">. */
export function isoToDateTimeLocal(iso: string | null) {
  return iso ? dateTimeToDateTimeLocal(DateTime.fromISO(iso)) : "";
}

/** Converts the value of <input type="datetime-local"> to ISO usable on the backend. */
export function dateTimeLocalToISO(dateTimeLocal: string) {
  return dateTimeLocal ? dateTimeToISO(DateTime.fromISO(dateTimeLocal)) : null;
}
