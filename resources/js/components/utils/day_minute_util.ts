import {DateTime} from "luxon";
import {Ordered, TimeSpan} from "../ui/calendar/types";

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
export function isOnDay(day: DateTime, timeSpan: TimeSpan) {
  if (timeSpan.allDay) {
    return timeSpan.range.contains(day);
  } else {
    return (
      timeSpan.date.hasSame(day, "day") ||
      (timeSpan.date.hasSame(day.minus({days: 1}), "day") &&
        timeSpan.startDayMinute + timeSpan.durationMinutes > MAX_DAY_MINUTE)
    );
  }
}

/**
 * Returns the day minute range of the specified time span, clamping to the specified day.
 * Returns undefined if the range is empty.
 */
export function getDayMinuteRange(day: DateTime, timeSpan: TimeSpan): DayMinuteRange | undefined {
  if (timeSpan.allDay) {
    return timeSpan.range.contains(day) ? FULL_DAY_MINUTE_RANGE : undefined;
  } else {
    const {date, startDayMinute, durationMinutes} = timeSpan;
    if (date.hasSame(day, "day")) {
      return [startDayMinute, Math.min(startDayMinute + durationMinutes, MAX_DAY_MINUTE)];
    } else if (date.hasSame(day.minus({days: 1}), "day") && startDayMinute + durationMinutes > MAX_DAY_MINUTE) {
      return [0, startDayMinute + durationMinutes - MAX_DAY_MINUTE];
    } else {
      return undefined;
    }
  }
}

export function crossesDateBoundaries(day: DateTime, timeSpan: TimeSpan) {
  const res = {fromPrevDay: false, toNextDay: false};
  if (timeSpan.allDay) {
    if (timeSpan.range.contains(day)) {
      if (timeSpan.range.start < day.startOf("day")) {
        res.fromPrevDay = true;
      }
      if (timeSpan.range.end > day.endOf("day")) {
        res.toNextDay = true;
      }
    }
  } else if (timeSpan.startDayMinute + timeSpan.durationMinutes > MAX_DAY_MINUTE) {
    if (timeSpan.date.hasSame(day.minus({days: 1}), "day")) {
      res.fromPrevDay = true;
    } else if (timeSpan.date.hasSame(day, "day")) {
      res.toNextDay = true;
    }
  }
  return res;
}

/**
 * Returns only the spans matching the day, sorted in the following way:
 * - First all-day spans, then part-day spans.
 * - In both groups, sort by the specified order first.
 * - If equal, sort by start time, then duration (in both groups).
 */
export function filterAndSortInDayView<T extends TimeSpan & Ordered>(day: DateTime, spans: readonly T[]) {
  return spans
    .filter((span) => isOnDay(day, span))
    .sort((a, b) => {
      const byOrder = (a.order ?? 0) - (b.order ?? 0);
      return a.allDay
        ? b.allDay
          ? byOrder ||
            a.range.start.toMillis() - b.range.start.toMillis() ||
            a.range.end.toMillis() - b.range.end.toMillis()
          : -1
        : b.allDay
          ? 1
          : byOrder ||
            (a.date.hasSame(b.date, "day")
              ? a.startDayMinute - b.startDayMinute || b.durationMinutes - a.durationMinutes
              : a.date.toMillis() - b.date.toMillis());
    });
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

export function dateTimeToDateTimeLocalInput(dateTime: DateTime) {
  return dateTime.toISO().slice(0, 16);
}

export function dateTimeLocalInputToDateTime(dateTimeLocalInputValue: string) {
  return DateTime.fromISO(dateTimeLocalInputValue);
}
