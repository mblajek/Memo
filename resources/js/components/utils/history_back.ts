import {NavigateOptions, useNavigate} from "@solidjs/router";
import {Timeout} from "components/utils/timeout";

/**
 * Returns a function that performs history.back, or navigates to the specified path if this fails.
 *
 * The failure is detected by either changing the location, or cleaning up this computation.
 */
export function createHistoryBack() {
  const navigate = useNavigate();
  const timer = new Timeout();
  return (fallbackPath: string, options?: Partial<NavigateOptions>) => {
    const loc = location.href;
    history.back();
    timer.set(() => {
      if (location.href === loc) {
        navigate(fallbackPath, options);
      }
    }, 100);
  };
}
