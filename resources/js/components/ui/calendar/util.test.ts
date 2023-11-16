import {DateTime, Interval} from "luxon";
import {describe, expect, test} from "vitest";
import {dayMinuteToHM, getDayMinute, getDayMinuteRange} from "./util";

describe("util", () => {
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
});
