import {itemAfter, orderForMoveBefore} from "features/technicals/util";
import {expect, test} from "vitest";

function items(...defs: readonly [id: string, order: number][]) {
  return defs.map(([id, order]) => ({id, resource: {defaultOrder: order}}));
}

test("itemAfter returns the direct successor", () => {
  expect(itemAfter(items(["a", 1], ["b", 2], ["c", 3]), "a")).toBe("b");
  expect(itemAfter(items(["a", 1], ["b", 2], ["c", 3]), "b")).toBe("c");
});

test("itemAfter returns undefined for the last item", () => {
  expect(itemAfter(items(["a", 1], ["b", 2]), "b")).toBeUndefined();
});

test("itemAfter returns undefined for an unknown item", () => {
  expect(itemAfter(items(["a", 1], ["b", 2]), "x")).toBeUndefined();
});

test("no move when the anchor is the direct successor", () => {
  expect(orderForMoveBefore(items(["a", 1], ["b", 2], ["c", 3]), {itemId: "a", anchorId: "b"})).toBeUndefined();
});

test("no move to the end when the item is already last", () => {
  expect(orderForMoveBefore(items(["a", 1], ["b", 2], ["c", 3]), {itemId: "c", anchorId: ""})).toBeUndefined();
});

test("moving up lands at the anchor's order", () => {
  expect(orderForMoveBefore(items(["a", 1], ["b", 2], ["c", 3]), {itemId: "c", anchorId: "a"})).toBe(1);
  expect(orderForMoveBefore(items(["a", 1], ["b", 2], ["c", 3]), {itemId: "c", anchorId: "b"})).toBe(2);
});

test("moving down lands right before the anchor, accounting for the vacated slot", () => {
  expect(orderForMoveBefore(items(["a", 1], ["b", 2], ["c", 3], ["d", 4]), {itemId: "a", anchorId: "d"})).toBe(3);
  expect(orderForMoveBefore(items(["a", 1], ["b", 2], ["c", 3], ["d", 4]), {itemId: "a", anchorId: "c"})).toBe(2);
});

test("moving to the end lands at the last item's order", () => {
  expect(orderForMoveBefore(items(["a", 1], ["b", 2], ["c", 3]), {itemId: "a", anchorId: ""})).toBe(3);
});

test("non-contiguous orders are used as absolute targets", () => {
  // Unlisted rows occupy the gaps; the item must land directly before/after in absolute terms.
  const list = items(["a", 2], ["b", 5], ["c", 9]);
  expect(orderForMoveBefore(list, {itemId: "a", anchorId: "c"})).toBe(8);
  expect(orderForMoveBefore(list, {itemId: "c", anchorId: "b"})).toBe(5);
  expect(orderForMoveBefore(list, {itemId: "b", anchorId: ""})).toBe(9);
});

test("no move onto the direct successor even across an order gap", () => {
  // Unlisted rows sit between a and b, but a is already directly before b among the
  // listed items, so there is nothing to change visibly.
  expect(orderForMoveBefore(items(["a", 2], ["b", 5]), {itemId: "a", anchorId: "b"})).toBeUndefined();
});

test("no move for an unknown anchor or item", () => {
  expect(orderForMoveBefore(items(["a", 1], ["b", 2]), {itemId: "a", anchorId: "x"})).toBeUndefined();
  expect(orderForMoveBefore(items(["a", 1], ["b", 2]), {itemId: "x", anchorId: "a"})).toBeUndefined();
});
