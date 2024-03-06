import {DateTime} from "luxon";
import {describe, expect, it} from "vitest";
import {DaysRange} from "./days_range";

describe("DaysRange", () => {
  function range(fromISO: string, toISO: string) {
    return new DaysRange(DateTime.fromISO(fromISO), DateTime.fromISO(toISO));
  }

  describe("constructor", () => {
    it("throws if the range is empty", () => {
      expect(() => range("2022-01-02", "2022-01-01")).toThrow();
    });
  });

  describe("center", () => {
    it("returns the center date and time of the range", () => {
      expect(range("2022-01-01", "2022-01-05").center()).toEqual(DateTime.fromISO("2022-01-03T12:00:00"));
      expect(range("2022-01-05", "2022-01-10").center()).toEqual(DateTime.fromISO("2022-01-08"));
    });
  });

  describe("contains", () => {
    it("returns true only if the day is within the range", () => {
      const r = range("2022-01-02", "2022-01-05");
      expect(r.contains(DateTime.fromISO("2022-01-01"))).toBe(false);
      expect(r.contains(DateTime.fromISO("2022-01-02"))).toBe(true);
      expect(r.contains(DateTime.fromISO("2022-01-03"))).toBe(true);
      expect(r.contains(DateTime.fromISO("2022-01-04"))).toBe(true);
      expect(r.contains(DateTime.fromISO("2022-01-05"))).toBe(true);
      expect(r.contains(DateTime.fromISO("2022-01-06"))).toBe(false);
    });
  });

  describe("intersects", () => {
    it("returns whether the ranges intersect", () => {
      const r = range("2022-01-02", "2022-01-05");
      expect(r.intersects(range("2022-01-01", "2022-01-01"))).toBe(false);
      expect(r.intersects(range("2022-01-01", "2022-01-02"))).toBe(true);
      expect(r.intersects(range("2022-01-01", "2022-01-03"))).toBe(true);
      expect(r.intersects(range("2022-01-01", "2022-01-07"))).toBe(true);
      expect(r.intersects(range("2022-01-03", "2022-01-04"))).toBe(true);
      expect(r.intersects(range("2022-01-03", "2022-01-07"))).toBe(true);
      expect(r.intersects(range("2022-01-05", "2022-01-07"))).toBe(true);
      expect(r.intersects(range("2022-01-06", "2022-01-07"))).toBe(false);
    });
  });

  describe("engulfs", () => {
    it("returns whether the other range is contained completely in this range", () => {
      const r = range("2022-01-02", "2022-01-05");
      expect(r.engulfs(range("2022-01-01", "2022-01-01"))).toBe(false);
      expect(r.engulfs(range("2022-01-01", "2022-01-02"))).toBe(false);
      expect(r.engulfs(range("2022-01-01", "2022-01-03"))).toBe(false);
      expect(r.engulfs(range("2022-01-01", "2022-01-07"))).toBe(false);
      expect(r.engulfs(range("2022-01-03", "2022-01-04"))).toBe(true);
      expect(r.engulfs(range("2022-01-03", "2022-01-07"))).toBe(false);
      expect(r.engulfs(range("2022-01-05", "2022-01-07"))).toBe(false);
      expect(r.engulfs(range("2022-01-06", "2022-01-07"))).toBe(false);
    });
  });

  describe("length", () => {
    it("returns the number of days in the range", () => {
      expect(range("2022-01-01", "2022-01-01").length()).toBe(1);
      expect(range("2022-01-01", "2022-03-02").length()).toBe(61);
    });
  });

  describe("[Symbol.iterator]", () => {
    it("iterates over the days in the range", () => {
      expect([...range("2022-01-01", "2022-01-04")]).toEqual([
        DateTime.fromISO("2022-01-01"),
        DateTime.fromISO("2022-01-02"),
        DateTime.fromISO("2022-01-03"),
        DateTime.fromISO("2022-01-04"),
      ]);
    });
  });
});
