/**
 * Focuses the specified element.
 *
 * For some reason, simply calling element.focus() doesn't always work. This function tries to focus the element
 * multiple times, until it is really focused.
 *
 * TODO: Determine what is causing the problems and get rid of this function.
 */
export function focusThis(element: HTMLElement) {
  let attempts = 0;
  function tryFocus() {
    element.focus();
    if (attempts++ <= 20 && document.activeElement !== element) {
      setTimeout(tryFocus, 2);
    }
  }
  tryFocus();
}
