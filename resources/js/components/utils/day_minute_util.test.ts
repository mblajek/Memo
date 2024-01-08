import {DateTime} from "luxon";
import {describe, expect, test} from "vitest";
import {PartDayTimeSpan} from "../ui/calendar/types";
import {
  MAX_DAY_MINUTE,
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
    function expectDayMinuteRange(dateStr: string, startHM: string, endHM: string) {
      function hmToDayMinute(hm: string) {
        const [hour, minute] = hm.split(":").map(Number);
        return hour! * 60 + minute!;
      }
      const timeSpan: PartDayTimeSpan = {
        allDay: false,
        date: DateTime.fromISO(dateStr),
        startDayMinute: hmToDayMinute(startHM),
        durationMinutes: ((hmToDayMinute(endHM) - hmToDayMinute(startHM) + MAX_DAY_MINUTE - 1) % MAX_DAY_MINUTE) + 1,
      };
      return expect(getDayMinuteRange(day, timeSpan));
    }
    expectDayMinuteRange("2023-03-25", "12:34", "23:00").toEqual(undefined);
    expectDayMinuteRange("2023-03-25", "12:34", "00:00").toEqual(undefined);
    expectDayMinuteRange("2023-03-25", "12:34", "00:01").toEqual([0, 1]);
    expectDayMinuteRange("2023-03-25", "18:34", "16:00").toEqual([0, 16 * 60]);
    expectDayMinuteRange("2023-03-25", "12:34", "16:00").toEqual(undefined);
    expectDayMinuteRange("2023-03-25", "00:00", "00:00").toEqual(undefined);
    expectDayMinuteRange("2023-03-26", "12:00", "16:00").toEqual([12 * 60, 16 * 60]);
    expectDayMinuteRange("2023-03-26", "12:00", "16:00").toEqual([12 * 60, 16 * 60]);
    expectDayMinuteRange("2023-03-26", "00:00", "00:00").toEqual([0, 24 * 60]);
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
