import {DateTime} from "luxon";
import {DaysRange} from "./days_range";

/** Returns a list of week days, sorted by index (0 to 6). */
export function getWeekdays() {
  return Array.from(getWeekFromDay(DateTime.fromMillis(0)), (exampleDay, index) => ({
    weekday: exampleDay.weekday,
    isWeekend: exampleDay.isWeekend,
    index,
    exampleDay,
  }));
}

/** Returns the calendar week that contains this day. */
export function getWeekFromDay(day: DateTime) {
  const start = day.startOf("week", {useLocaleWeeks: true});
  return new DaysRange(start, start.plus({days: 6}));
}

/** Returns the work week that contains this day, or the calendar week if the day is on weekend. */
export function getWorkWeekFromDay(day: DateTime) {
  if (day.isWeekend) {
    return getWeekFromDay(day);
  }
  let start = day.startOf("week", {useLocaleWeeks: true});
  while (start.isWeekend) {
    start = start.plus({days: 1});
  }
  let d = start;
  let end = d;
  while (!d.isWeekend) {
    end = d;
    d = d.plus({day: 1});
  }
  return new DaysRange(start, end);
}
