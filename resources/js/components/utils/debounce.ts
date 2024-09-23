import {Accessor, createComputed, createSignal, getOwner, on, onCleanup, runWithOwner} from "solid-js";

export const INPUT_DEBOUNCE_MS = 600;

/**
 * Creates an accessor that delays changes to the input accessor, by not more than
 * the specified time. If outputImmediately is specified and returns true for an input
 * element then that element is passed to output without the delay.
 *
 * Example timeline:
 *
 * - with lazy: false
 *
 *     input:          a----b--c--de f-----g--------h-i---j--
 *     output:         a----b---c-d---f----g--------h-i---j--
 *     timeMs:              |---^ |---^    |---^    |-
 *     outputImmediately:   f  f  ff f     f        f t   t
 *
 * - with lazy: true
 *
 *     input:          a----b--c--de f-----g--------h-i---j--
 *     output:         a--------c-----f--------g------i---j--
 *     timeMs:              |---^ |---^    |---^    |-
 *     outputImmediately:   f  f  ff f     f        f t   t
 *
 * Calling this function causes eslint to complain because it doesn't understand that
 * this function is a tracked scope, but it is, so just suppress the warning.
 */
export function debouncedAccessor<T>(
  input: Accessor<T>,
  {
    timeMs = INPUT_DEBOUNCE_MS,
    lazy = false,
    outputImmediately = () => false,
  }: {
    timeMs?: number | (() => number);
    lazy?: boolean;
    outputImmediately?: (t: T) => boolean;
  } = {},
): Accessor<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let needsWriteOutput = false;
  const [output, setOutput] = createSignal<T>(input());
  const owner = getOwner();
  function writeOutput(...value: [T?]) {
    runWithOwner(owner, () => setOutput(value.length ? () => value[0]! : input));
    needsWriteOutput = false;
  }
  function setTimer() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(
      () => {
        if (needsWriteOutput) {
          writeOutput();
        }
        timeoutId = undefined;
      },
      typeof timeMs === "number" ? timeMs : timeMs(),
    );
  }
  createComputed(
    on(input, (input) => {
      if (outputImmediately?.(input)) {
        writeOutput(input);
        setTimer();
      } else if (timeoutId) {
        needsWriteOutput = true;
      } else {
        setTimer();
        if (lazy) {
          needsWriteOutput = true;
        } else {
          writeOutput(input);
        }
      }
    }),
  );
  onCleanup(() => clearTimeout(timeoutId));
  return output;
}

export function delayedAccessor<T>(
  input: Accessor<T>,
  {timeMs, outputImmediately}: {timeMs?: number | (() => number); outputImmediately?: (t: T) => boolean} = {},
) {
  return debouncedAccessor(input, {timeMs, lazy: true, outputImmediately});
}

/**
 * Creates a debounced accessor for a string signal that delays all changes apart from clearing
 * the string value, which goes through immediately.
 */
export function debouncedFilterTextAccessor(input: Accessor<string>, {timeMs}: {timeMs?: number} = {}) {
  return debouncedAccessor(input, {timeMs, lazy: true, outputImmediately: (v) => !v});
}
