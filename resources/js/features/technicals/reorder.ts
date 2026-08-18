export interface ReorderItem {
  readonly id: string;
  /** The absolute backend order of the item. */
  readonly order: number;
  /** Whether the item itself may be moved. Immovable items still shift as others move around them. */
  readonly movable: boolean;
}

export interface ReorderMove {
  readonly id: string;
  /** The absolute backend order to move the item to. */
  readonly order: number;
}

/**
 * Computes a minimal sequence of single-item moves transforming the current order of the items
 * into the specified final order. The moves mirror the backend semantics: the moved item lands
 * exactly at the target order and the rows in between shift by one towards the freed spot.
 *
 * The listed items need not occupy contiguous orders: unlisted rows may sit in the gaps and
 * shift along, which does not affect the relative order of the listed items. The immovable
 * items must have the same relative order in both sequences.
 */
export function reorderMoves(items: readonly ReorderItem[], finalIds: readonly string[]): ReorderMove[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const finalItems = finalIds.map((id) => byId.get(id)!);
  // The items keeping their current order: all the immovable items plus the most numerous
  // possible subset of the movable ones consistently ordered between them.
  const kept = new Set<string>();
  let segment: ReorderItem[] = [];
  let lowerBound = 0;
  function closeSegment(upperBound: number) {
    const candidates = segment.filter((item) => item.order > lowerBound && item.order < upperBound);
    for (const index of longestIncreasingSubsequence(candidates.map((item) => item.order)))
      kept.add(candidates[index]!.id);
    segment = [];
  }
  for (const item of finalItems) {
    if (item.movable) {
      segment.push(item);
    } else {
      closeSegment(item.order);
      kept.add(item.id);
      lowerBound = item.order;
    }
  }
  closeSegment(Infinity);

  const orders = new Map(items.map((item) => [item.id, item.order]));
  const moves: ReorderMove[] = [];
  function moveTo(id: string, target: number) {
    const from = orders.get(id)!;
    if (target === from) {
      return;
    }
    for (const [otherId, order] of orders) {
      if (target > from ? order > from && order <= target : order >= target && order < from) {
        orders.set(otherId, order + (target > from ? -1 : 1));
      }
    }
    orders.set(id, target);
    moves.push({id, order: target});
  }
  finalItems.forEach((item, index) => {
    if (kept.has(item.id)) {
      return;
    }
    const order = orders.get(item.id)!;
    if (index) {
      // The final predecessor is already settled (kept, or moved into place earlier).
      const anchor = orders.get(finalItems[index - 1]!.id)!;
      moveTo(item.id, order > anchor ? anchor + 1 : anchor);
    } else {
      // The first item has no predecessor: place it directly before the first settled item.
      const successor = orders.get(finalItems.find((other) => kept.has(other.id))!.id)!;
      moveTo(item.id, order > successor ? successor : successor - 1);
    }
  });
  return moves;
}

/** Returns the indexes of a longest strictly increasing subsequence of the values. */
function longestIncreasingSubsequence(values: readonly number[]): number[] {
  const length: number[] = [];
  const previous: number[] = [];
  let bestEnd = -1;
  for (let i = 0; i < values.length; i++) {
    length[i] = 1;
    previous[i] = -1;
    for (let j = 0; j < i; j++) {
      if (values[j]! < values[i]! && length[j]! + 1 > length[i]!) {
        length[i] = length[j]! + 1;
        previous[i] = j;
      }
    }
    if (bestEnd < 0 || length[i]! > length[bestEnd]!) {
      bestEnd = i;
    }
  }
  const result: number[] = [];
  for (let i = bestEnd; i >= 0; i = previous[i]!) {
    result.unshift(i);
  }
  return result;
}
