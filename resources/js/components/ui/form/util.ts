/**
 * Trims a value from a text input field into the value that is sent to the backend.
 *
 * Doing this on the frontend is more reasonable than doing this for all fields, regardless
 * of their origin, on the backend.
 */
export function trimInput(inputValue: string) {
  return inputValue.trim();
}

/**
 * Returns a handler that trims the input value. Intended use:
 *
 *     <input type="text" ... onBlur={getTrimInputHandler()} />
 */
export function getTrimInputHandler() {
  return (event: Event) => {
    const target = event.currentTarget;
    if (target instanceof HTMLInputElement) {
      target.value = trimInput(target.value);
      target.dispatchEvent(new Event("input", {bubbles: true}));
    }
  };
}
