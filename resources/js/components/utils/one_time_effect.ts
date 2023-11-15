import {createEffect} from "solid-js";
import {Accessor, createSignal} from "solid-js";

/**
 * Creates an effect that runs once, when the input returns a non-undefined value for the first time
 * (which may be immediately).
 *
 * Returns a function that can be called to reënable the effect for another single call of
 * the effect function.
 */
export function createOneTimeEffect<T>({
  input,
  effect,
  initialActive = true,
}: {
  input: Accessor<T | undefined>;
  effect: (value: T) => void;
  initialActive?: boolean;
}) {
  const [active, setActive] = createSignal(initialActive);
  createEffect(() => {
    if (active()) {
      const inputVal = input();
      if (inputVal !== undefined) {
        effect(inputVal);
        setActive(false);
      }
    }
  });
  return () => setActive(true);
}
