import {Accessor, createComputed, createSignal, getOwner, onCleanup, runWithOwner} from "solid-js";

export const INPUT_DEBOUNCE_MS = 600;

/**
 * Creates an accessor that delays changes to the input accessor, by not more than
 * the specified time. If outputImmediately is specified and returns true for an input
 * element then that element is passed to output without the delay.
 *
 * Example timeline:
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
    outputImmediately = () => false,
  }: {
    timeMs?: number;
    outputImmediately?: (t: T) => boolean;
  } = {},
): Accessor<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const [output, setOutput] = createSignal<T>(input());
  const owner = getOwner();
  createComputed(() => {
    if (outputImmediately?.(input())) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
      setOutput(input);
    } else if (!timeoutId)
      timeoutId = setTimeout(() => {
        runWithOwner(owner, () => setOutput(input));
        timeoutId = undefined;
      }, timeMs);
  });
  onCleanup(() => clearTimeout(timeoutId));
  return output;
}

/**
 * Creates a debounced accessor for a string signal that delays all changes apart from clearing
 * the string value, which goes through immediately.
 */
export function debouncedFilterTextAccessor(input: Accessor<string>, {timeMs}: {timeMs?: number} = {}) {
  return debouncedAccessor(input, {timeMs, outputImmediately: (v) => !v});
}
