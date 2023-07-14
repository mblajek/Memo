import {Accessor, createEffect, createSignal, on, onCleanup} from "solid-js";

export const INPUT_DEBOUNCE_MS = 600;

/**
 * Creates an accessor that delays changes to the input accessor, by not more than
 * the specified time.
 *
 * Example timeline:
 *
 *     input:  a----b--c--d--e--f------g--------
 *     output: a--------c-----e-----f------g----
 *     timeMs:      |---^ |---^ |---^  |---^
 *
 * Calling this function causes eslint to complain because it doesn't understand that
 * this function is a tracked scope, but it is, so just suppress the warning.
 */
export function debouncedAccessor<T>(input: Accessor<T>, timeMs = INPUT_DEBOUNCE_MS):
  Accessor<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const [output, setOutput] = createSignal<T>(input());
  createEffect(on(input, () => {
    if (!timeoutId)
      timeoutId = setTimeout(() => {
        setOutput(input);
        timeoutId = undefined;
      }, timeMs);
  }));
  onCleanup(() => clearTimeout(timeoutId));
  return output;
}
