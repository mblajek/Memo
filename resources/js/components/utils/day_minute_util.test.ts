import {DateTime, Interval} from "luxon";
import {describe, expect, test} from "vitest";
import {
  dayMinuteToHM,
  dayMinuteToTimeInput,
  getDayMinute,
  getDayMinuteRange,
  timeInputToDayMinute,
} from "./day_minute_util";

describe("day_minute_util", () => {
  test("getDayMinute", () => {
    expect(getDayMinute(DateTime.fromISO("2023-03-26T01:00"))).toEqual(1 * 60);
    expect(getDayMinute(DateTime.fromISO("2023-03-26T04:00"))).toEqual(4 * 60);
  });

  test("dayMinuteToHM", () => {
    expect(dayMinuteToHM(10 * 60 + 30)).toEqual({hour: 10, minute: 30});
  });

  test("getDayMinuteRange", () => {
    const day = DateTime.fromISO("2023-03-26T12:34:56");
    function expectDayMinuteRange(start: string, end: string) {
      return expect(getDayMinuteRange(day, Interval.fromDateTimes(DateTime.fromISO(start), DateTime.fromISO(end))));
    }
    expectDayMinuteRange("2023-03-25T12:34:56", "2023-03-25T23:00").toEqual(undefined);
    expectDayMinuteRange("2023-03-25T12:34:56", "2023-03-26T00:00").toEqual(undefined);
    expectDayMinuteRange("2023-03-25T12:34:56", "2023-03-26T00:01").toEqual([0, 1]);
    expectDayMinuteRange("2023-03-25T12:34:56", "2023-03-26T16:00").toEqual([0, 16 * 60]);
    expectDayMinuteRange("2023-03-25T12:34:56", "2023-03-27T16:00").toEqual([0, 24 * 60]);
    expectDayMinuteRange("2023-03-26T12:00", "2023-03-26T16:00").toEqual([12 * 60, 16 * 60]);
    expectDayMinuteRange("2023-03-26T12:00", "2023-03-27T16:00").toEqual([12 * 60, 24 * 60]);
  });

  test("timeInputToDayMinute", () => {
    expect(timeInputToDayMinute("")).toEqual(undefined);
    expect(timeInputToDayMinute("08:05")).toEqual(8 * 60 + 5);
    expect(timeInputToDayMinute("12:34")).toEqual(12 * 60 + 34);
    expect(timeInputToDayMinute("12:34:56")).toEqual(12 * 60 + 34);
    expect(() => timeInputToDayMinute("", {assert: true})).toThrow();
  });

  test("dayMinuteToTimeInput", () => {
    expect(dayMinuteToTimeInput(8 * 60 + 5)).toEqual("08:05");
    expect(dayMinuteToTimeInput(12 * 60 + 34)).toEqual("12:34");
  });
});
