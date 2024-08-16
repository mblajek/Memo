import {Obj} from "@felte/core";
import {FormType} from "components/felte-form/FelteForm";
import {Accessor, createComputed, createMemo, on} from "solid-js";

/**
 * Trims a value from a text input field into the value that is sent to the backend.
 *
 * Doing this on the frontend is more reasonable than doing this for all fields, regardless
 * of their origin, on the backend.
 *
 * This function also removes double spaces from the text.
 */
export function trimInput(inputValue: string) {
  return inputValue
    .trim()
    .replaceAll(new RegExp(`${HORIZONTAL_WHITESPACE}+$`, "gm"), "")
    .replaceAll(new RegExp(`(.)${HORIZONTAL_WHITESPACE}+(.)`, "gm"), "$1 $2");
}

const HORIZONTAL_WHITESPACE = "[^\\S\\r\\n]";

/**
 * A helper for inputs and textareas that trims them on blur. Intended use:
 *
 *     <input type="text" ... {...TRIM_ON_BLUR} />
 */
export const TRIM_ON_BLUR = {
  onFocusOut: (event: Event) => {
    const target = event.currentTarget;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const trimmedValue = trimInput(target.value);
      if (trimmedValue !== target.value) {
        target.value = trimmedValue;
        target.dispatchEvent(new Event("input", {bubbles: true}));
      }
    }
  },
};

/** Creates a computation that nudges the form data, i.e. fixes reactivity loss in it. */
export function createFormNudge<T extends Obj>(form: FormType<T>, observedValue: Accessor<unknown>) {
  const observedMemo = createMemo(observedValue);
  createComputed(on(observedMemo, () => form.setData((d) => d)));
}
