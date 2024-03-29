import {DateTime} from "luxon";
import {describe, expect, test} from "vitest";
import {DaysRange} from "./days_range";
import {WeekDaysCalculator} from "./week_days_calculator";

describe("WeekDaysCalculator", () => {
  const pl = new WeekDaysCalculator(new Intl.Locale("pl-PL"));
  const us = new WeekDaysCalculator(new Intl.Locale("en-US"));

  test("dayToWeek returns the correct calendar week", () => {
    // Sunday
    const day = DateTime.fromISO("2023-10-15");
    expect(pl.dayToWeek(day)).toEqual(new DaysRange(DateTime.fromISO("2023-10-09"), DateTime.fromISO("2023-10-15")));
    expect(us.dayToWeek(day)).toEqual(new DaysRange(DateTime.fromISO("2023-10-15"), DateTime.fromISO("2023-10-21")));
  });

  test("dayToWorkdays returns the correct work week", () => {
    // Sunday
    expect(pl.dayToWorkdays(DateTime.fromISO("2023-10-15"))).toEqual(
      new DaysRange(DateTime.fromISO("2023-10-09"), DateTime.fromISO("2023-10-15")),
    );
    expect(us.dayToWorkdays(DateTime.fromISO("2023-10-15"))).toEqual(
      new DaysRange(DateTime.fromISO("2023-10-15"), DateTime.fromISO("2023-10-21")),
    );

    // Tuesday
    expect(pl.dayToWorkdays(DateTime.fromISO("2023-10-17"))).toEqual(
      new DaysRange(DateTime.fromISO("2023-10-16"), DateTime.fromISO("2023-10-20")),
    );
    expect(us.dayToWorkdays(DateTime.fromISO("2023-10-17"))).toEqual(
      new DaysRange(DateTime.fromISO("2023-10-16"), DateTime.fromISO("2023-10-20")),
    );
  });

  test("startOfWeek returns the correct start of week", () => {
    // Tuesday
    expect(pl.startOfWeek(DateTime.fromISO("2023-10-17")).toISODate()).toBe("2023-10-16");
    expect(us.startOfWeek(DateTime.fromISO("2023-10-17")).toISODate()).toBe("2023-10-15");
  });

  test("isWeekend returns true for weekends", () => {
    // Tuesday
    expect(pl.isWeekend(DateTime.fromISO("2023-10-17"))).toBe(false);
    expect(us.isWeekend(DateTime.fromISO("2023-10-17"))).toBe(false);
    // Sunday
    expect(pl.isWeekend(DateTime.fromISO("2023-10-15"))).toBe(true);
    expect(us.isWeekend(DateTime.fromISO("2023-10-15"))).toBe(true);
  });

  test("isStartOfWeek returns true for start of week", () => {
    // Friday
    expect(pl.isStartOfWeek(DateTime.fromISO("2023-10-13"))).toBe(false);
    expect(us.isStartOfWeek(DateTime.fromISO("2023-10-13"))).toBe(false);
    // Saturday
    expect(pl.isStartOfWeek(DateTime.fromISO("2023-10-14"))).toBe(false);
    expect(us.isStartOfWeek(DateTime.fromISO("2023-10-14"))).toBe(false);
    // Sunday
    expect(pl.isStartOfWeek(DateTime.fromISO("2023-10-15"))).toBe(false);
    expect(us.isStartOfWeek(DateTime.fromISO("2023-10-15"))).toBe(true);
    // Monday
    expect(pl.isStartOfWeek(DateTime.fromISO("2023-10-16"))).toBe(true);
    expect(us.isStartOfWeek(DateTime.fromISO("2023-10-16"))).toBe(false);
    // Tuesday
    expect(pl.isStartOfWeek(DateTime.fromISO("2023-10-17"))).toBe(false);
    expect(us.isStartOfWeek(DateTime.fromISO("2023-10-17"))).toBe(false);
  });

  test("isEndOfWeek returns true for end of week", () => {
    // Friday
    expect(pl.isEndOfWeek(DateTime.fromISO("2023-10-13"))).toBe(false);
    expect(us.isEndOfWeek(DateTime.fromISO("2023-10-13"))).toBe(false);
    // Saturday
    expect(pl.isEndOfWeek(DateTime.fromISO("2023-10-14"))).toBe(false);
    expect(us.isEndOfWeek(DateTime.fromISO("2023-10-14"))).toBe(true);
    // Sunday
    expect(pl.isEndOfWeek(DateTime.fromISO("2023-10-15"))).toBe(true);
    expect(us.isEndOfWeek(DateTime.fromISO("2023-10-15"))).toBe(false);
    // Monday
    expect(pl.isEndOfWeek(DateTime.fromISO("2023-10-16"))).toBe(false);
    expect(us.isEndOfWeek(DateTime.fromISO("2023-10-16"))).toBe(false);
    // Tuesday
    expect(pl.isEndOfWeek(DateTime.fromISO("2023-10-17"))).toBe(false);
    expect(us.isEndOfWeek(DateTime.fromISO("2023-10-17"))).toBe(false);
  });
});
