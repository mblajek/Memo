import {describe, expect, test} from "vitest";
import {OverlapData, calculateOverlaps} from "./overlaps_calculator";

describe("overlaps_calculator", () => {
  function checkOverlaps(spans: readonly [start: number, end: number, expectedOverlap: OverlapData | undefined][]) {
    const overlaps = calculateOverlaps(spans, ([start, end]) => [start, end]);
    expect(overlaps).toEqual(new Map(spans.filter((span) => span[2]).map((span) => [span, span[2]])));
  }

  test("no overlaps", () => {
    checkOverlaps([
      [12_00, 16_00, undefined],
      [16_00, 20_00, undefined],
      [11_00, 11_30, undefined],
    ]);
  });

  test("simple overlaps", () => {
    checkOverlaps([
      [12_00, 16_00, {count: 2, index: 0}],
      [13_00, 15_00, {count: 2, index: 1}],
      [8_00, 9_00, {count: 2, index: 1}],
      [7_30, 8_30, {count: 2, index: 0}],
    ]);
  });

  test("overlaps with multiple spans", () => {
    checkOverlaps([
      [5_00, 8_00, {count: 3, index: 0}],
      [6_00, 9_00, {count: 3, index: 1}],
      [7_00, 10_00, {count: 3, index: 2}],
      [8_00, 11_00, {count: 3, index: 0}],
      [9_00, 12_00, {count: 3, index: 1}],

      [18_00, 20_00, {count: 2, index: 0}],
      [19_00, 21_00, {count: 2, index: 1}],
      [20_00, 22_00, {count: 2, index: 0}],

      [23_00, 23_15, {count: 2, index: 1}],
      [23_00, 23_30, {count: 2, index: 0}],
    ]);
  });

  test("overlaps with backpropagation", () => {
    checkOverlaps([
      [10_00, 15_00, {count: 3, index: 0}],
      [14_00, 20_00, {count: 3, index: 1}],
      [19_00, 20_00, {count: 3, index: 0}],
      [19_00, 20_00, {count: 3, index: 2}],
    ]);
  });
});
