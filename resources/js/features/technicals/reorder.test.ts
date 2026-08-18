import {reorderMoves, ReorderItem} from "features/technicals/reorder";
import {expect, test} from "vitest";

function items(...defs: readonly [id: string, order: number, movable?: boolean][]): ReorderItem[] {
  return defs.map(([id, order, movable = true]) => ({id, order, movable}));
}

test("no moves when the order is unchanged", () => {
  expect(reorderMoves(items(["a", 1], ["b", 2], ["c", 3]), ["a", "b", "c"])).toEqual([]);
});

test("single move to the front", () => {
  expect(reorderMoves(items(["a", 1], ["b", 2], ["c", 3], ["d", 4]), ["d", "a", "b", "c"])).toEqual([
    {id: "d", order: 1},
  ]);
});

test("single move to the back", () => {
  expect(reorderMoves(items(["a", 1], ["b", 2], ["c", 3], ["d", 4]), ["b", "c", "d", "a"])).toEqual([
    {id: "a", order: 4},
  ]);
});

test("moving around an immovable item", () => {
  // The immovable item must be kept, even though keeping b and c would also be a valid
  // longest subsequence.
  expect(reorderMoves(items(["f", 1, false], ["b", 2], ["c", 3]), ["b", "f", "c"])).toEqual([{id: "b", order: 1}]);
});

test("non-contiguous orders are preserved in the computation", () => {
  // Unlisted rows occupy the gaps; the moves refer to absolute orders.
  expect(reorderMoves(items(["a", 2], ["b", 5], ["c", 9]), ["c", "a", "b"])).toEqual([{id: "c", order: 2}]);
});

test("consecutive moves account for the shifts of the earlier ones", () => {
  expect(
    reorderMoves(items(["a", 1], ["b", 2], ["c", 3], ["d", 4], ["e", 5]), ["b", "d", "a", "c", "e"]),
  ).toEqual([
    {id: "a", order: 4},
    {id: "c", order: 4},
  ]);
});

test("reversal moves all but one item", () => {
  expect(reorderMoves(items(["a", 1], ["b", 2], ["c", 3]), ["c", "b", "a"])).toEqual([
    {id: "b", order: 3},
    {id: "a", order: 3},
  ]);
});

test("moving between two immovable items shifts them passively", () => {
  const moves = reorderMoves(items(["f1", 1, false], ["a", 2], ["f2", 3, false], ["b", 4]), ["f1", "b", "f2", "a"]);
  expect(moves).toEqual([
    {id: "b", order: 2},
    {id: "a", order: 4},
  ]);
});

test("item relatively ordered but outside its slot between immovables must move", () => {
  // a precedes f already, but the final order needs it after f, which cannot itself move.
  expect(reorderMoves(items(["a", 1], ["f", 5, false]), ["f", "a"])).toEqual([{id: "a", order: 5}]);
});

test("randomized: moves patch only movable items and produce the final order", () => {
  const random = mulberry32(12345);
  for (let trial = 0; trial < 200; trial++) {
    // Random items with gaps in the orders (for unlisted rows in between).
    const count = 1 + Math.floor(random() * 8);
    let order = 0;
    const trialItems: ReorderItem[] = [];
    for (let i = 0; i < count; i++) {
      order += 1 + Math.floor(random() * 3);
      trialItems.push({id: `i${i}`, order, movable: random() < 0.7});
    }
    // A random final order preserving the relative order of the immovable items.
    const finalIds = [...trialItems].sort(() => random() - 0.5).map((item) => item.id);
    const immovableIds = trialItems.filter((item) => !item.movable).map((item) => item.id);
    const immovableSlots = finalIds.flatMap((id, index) => (immovableIds.includes(id) ? [index] : []));
    immovableSlots.forEach((slot, index) => (finalIds[slot] = immovableIds[index]!));

    const moves = reorderMoves(trialItems, finalIds);
    const movableIds = new Set(trialItems.filter((item) => item.movable).map((item) => item.id));
    for (const move of moves) {
      expect(movableIds, `trial ${trial}`).toContain(move.id);
    }
    expect(simulate(trialItems, moves), `trial ${trial}`).toEqual(finalIds);
  }
});

/** Applies the moves using the backend shift semantics and returns the resulting id order. */
function simulate(trialItems: readonly ReorderItem[], moves: readonly {id: string; order: number}[]): string[] {
  const orders = new Map(trialItems.map((item) => [item.id, item.order]));
  for (const {id, order: target} of moves) {
    const from = orders.get(id)!;
    for (const [otherId, otherOrder] of orders) {
      if (otherId !== id && (target > from ? otherOrder > from && otherOrder <= target : otherOrder >= target && otherOrder < from)) {
        orders.set(otherId, otherOrder + (target > from ? -1 : 1));
      }
    }
    orders.set(id, target);
  }
  return [...orders.entries()].sort(([, orderA], [, orderB]) => orderA - orderB).map(([id]) => id);
}

/** A tiny deterministic PRNG, to keep the randomized test reproducible. */
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let z = seed;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
