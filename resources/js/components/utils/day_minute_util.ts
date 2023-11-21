import {DateTime, Interval} from "luxon";

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

export function formatDayMinuteHM(dayMinute: number) {
  return DateTime.fromObject({
    year: 2000,
    month: 1,
    day: 1,
    ...dayMinuteToHM(dayMinute),
  }).toLocaleString({hour: "numeric", minute: "2-digit"});
}

/** Checks whether the time span is at least partially on the given day. */
export function isOnDay(day: DateTime, interval: Interval) {
  return !!getDayMinuteRange(day, interval);
}

/**
 * Returns the day minute range of the specified time span, clamping to the specified day.
 * Returns undefined if the range is empty.
 */
export function getDayMinuteRange(day: DateTime, {start, end}: Interval): DayMinuteRange | undefined {
  const dayStart = day.startOf("day");
  const dayEnd = dayStart.plus({days: 1});
  if (end <= dayStart || start >= dayEnd) {
    return undefined;
  }
  const rangeStart = DateTime.max(dayStart, start);
  const rangeEnd = DateTime.min(dayEnd, end);
  return [
    getDayMinute(rangeStart),
    rangeEnd.toMillis() === dayEnd.toMillis() ? MAX_DAY_MINUTE : getDayMinute(rangeEnd),
  ];
}

export function timeInputToDayMinute(timeInputValue: string, params?: {assert?: false}): number | undefined;
export function timeInputToDayMinute(timeInputValue: string, params: {assert: true}): number;
export function timeInputToDayMinute(timeInputValue: string, {assert = false} = {}) {
  if (!timeInputValue) {
    if (assert) {
      throw new Error(`Empty time input value`);
    }
    return undefined;
  }
  const [hour, minute] = timeInputValue.split(":").map(Number);
  return hour! * 60 + minute!;
}

export function dayMinuteToTimeInput(dayMinute: number) {
  const {hour, minute} = dayMinuteToHM(dayMinute);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function dateTimeToTimeInput(dateTime: DateTime) {
  return dateTime.toISOTime().slice(0, 5);
}
