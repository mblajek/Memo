import {NavigateOptions, useNavigate} from "@solidjs/router";
import {onCleanup} from "solid-js";

/**
 * Returns a function that performs history.back, or navigates to the specified path if this fails.
 *
 * The failure is detected by either changing the location, or cleaning up this computation.
 */
export function createHistoryBack() {
  const navigate = useNavigate();
  let timerId: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timerId));
  return (fallbackPath: string, options?: Partial<NavigateOptions>) => {
    const loc = location.href;
    history.back();
    timerId = setTimeout(() => {
      if (location.href === loc) {
        navigate(fallbackPath, options);
      }
    }, 100);
  };
}
