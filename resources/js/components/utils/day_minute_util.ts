import {DateTime} from "luxon";
import {PartDayTimeSpan} from "../ui/calendar/types";

export type DayMinuteRange = readonly [number, number];

export const MAX_DAY_MINUTE = 24 * 60;
export const FULL_DAY_MINUTE_RANGE: DayMinuteRange = [0, MAX_DAY_MINUTE];

export function getDayMinute(time: DateTime) {
  return 60 * time.hour + time.minute + time.second / 60;
}

export function dayMinuteToHM(dayMinute: number) {
  if (dayMinute < 0 || dayMinute >= MAX_DAY_MINUTE) {
    throw new Error(`Invalid day minute: ${dayMinute}`);
  }
  return {
    hour: Math.floor(dayMinute / 60),
    minute: dayMinute % 60,
  };
}

export function formatDayMinuteHM(dayMinute: number, formatOpts?: Intl.DateTimeFormatOptions) {
  return DateTime.fromObject({
    year: 2000,
    month: 1,
    day: 1,
    ...dayMinuteToHM(dayMinute),
  }).toLocaleString({hour: "numeric", minute: "2-digit", ...formatOpts});
}

/** Checks whether the time span is at least partially on the given day. */
export function isOnDay(day: DateTime, timeSpan: PartDayTimeSpan) {
  return !!getDayMinuteRange(day, timeSpan);
}

/**
 * Returns the day minute range of the specified time span, clamping to the specified day.
 * Returns undefined if the range is empty.
 */
export function getDayMinuteRange(
  day: DateTime,
  {date, startDayMinute, durationMinutes}: PartDayTimeSpan,
): DayMinuteRange | undefined {
  if (date.hasSame(day, "day")) {
    return [startDayMinute, Math.min(startDayMinute + durationMinutes, MAX_DAY_MINUTE)];
  } else if (date.hasSame(day.minus({days: 1}), "day") && startDayMinute + durationMinutes > MAX_DAY_MINUTE) {
    return [0, startDayMinute + durationMinutes - MAX_DAY_MINUTE];
  } else {
    return undefined;
  }
}

export function timeInputToHM(timeInputValue: string) {
  const [hour, minute] = timeInputValue.split(":").map((e) => Number(e));
  return {hour: hour!, minute: minute!};
}

export function timeInputToDayMinute(timeInputValue: string | undefined, params?: {assert?: false}): number | undefined;
export function timeInputToDayMinute(timeInputValue: string, params: {assert: true}): number;
export function timeInputToDayMinute(timeInputValue: string | undefined, {assert = false} = {}) {
  if (!timeInputValue) {
    if (assert) {
      throw new Error(`Empty time input value`);
    }
    return undefined;
  }
  const {hour, minute} = timeInputToHM(timeInputValue);
  return hour * 60 + minute;
}

export function dayMinuteToTimeInput(dayMinute: number) {
  const {hour, minute} = dayMinuteToHM(dayMinute);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function dateTimeToTimeInput(dateTime: DateTime) {
  return dateTime.toISOTime().slice(0, 5);
}
