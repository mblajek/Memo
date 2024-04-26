const OP_START = 1;
const OP_END = 0;

/**
 * Information of the overlap status of a single object.
 *
 * Overlapping objects are placed next to each other, in sub-columns. For example two overlapping
 * objects will be placed in two sub-columns (`count: 2`), one in the first sub-column and the other
 * in the second sub-column (`index: 0` and `index: 1` respectively).
 */
export interface OverlapData {
  /** The number of sub-columns existing in the area where this object is placed. */
  count: number;
  /** The sub-column index where this object should be placed. */
  index: number;
}

/**
 * Calculates the overlaps of the specified objects, each of which with its time span,
 * and produces information useful for displaying the objects in a single column.
 *
 * The objects can be of any type, and getSpan needs to return a `[start, end]` tuple, with
 * arbitrary units.
 */
export function calculateOverlaps<T>(
  objects: readonly T[],
  getSpan: (t: T) => readonly [number, number],
): Map<T, OverlapData> {
  const overlapsMap = new Map<T, OverlapData>();
  const spanEdges = objects
    .flatMap((object) => {
      const [start, end] = getSpan(object);
      const length = end - start;
      return [
        {time: start, op: OP_START, object, length},
        {time: end, op: OP_END, object, length},
      ];
    })
    .sort(
      (a, b) =>
        a.time - b.time ||
        // Sort ends before starts when tied.
        a.op - b.op ||
        // Sort longer spans before shorter ones when tied.
        b.length - a.length,
    );
  // Sweep through time, keeping track of the currently active spans.
  const currentObjects = new Set<T>();
  for (const {op, object} of spanEdges) {
    if (op === OP_END) {
      currentObjects.delete(object);
    } else {
      /** The number of overlapping spans at this point. */
      const count = Math.max(
        currentObjects.size + 1,
        // If there are multiple older overlapping spans, they for sure have the same count,
        // and new count cannot be lower than that.
        currentObjects.size ? overlapsMap.get(currentObjects.values().next().value)?.count || 0 : 0,
      );
      if (count > 1) {
        const currentSpansOverlaps = Array.from(currentObjects, (other) => {
          let overlap = overlapsMap.get(other);
          if (overlap) {
            overlap.count = count;
          } else {
            overlap = {count, index: 0};
            overlapsMap.set(other, overlap);
          }
          return overlap;
        });
        for (let index = 0; index < count; index++)
          if (!currentSpansOverlaps.some((ov) => index === ov.index)) {
            // Use the first unused index for the new object.
            overlapsMap.set(object, {count, index});
            break;
          }
      }
      currentObjects.add(object);
    }
  }
  // Propagate the count backwards for cases like this:
  // A: [-----]
  // B:      [------]
  // C:           [-]
  // D:           [-]
  // In this case B takes 1/3, and so should A, even though it overlaps directly only with B.
  for (const {op, object} of spanEdges.toReversed()) {
    if (op === OP_START) {
      currentObjects.delete(object);
    } else {
      currentObjects.add(object);
      // Apply the max count at this point to all the overlapping spans.
      if (currentObjects.size > 1) {
        const count = Math.max(...Array.from(currentObjects, (obj) => overlapsMap.get(obj)?.count || 0));
        for (const obj of currentObjects) {
          const overlap = overlapsMap.get(obj);
          if (overlap) {
            overlap.count = count;
          }
        }
      }
    }
  }
  return overlapsMap;
}
