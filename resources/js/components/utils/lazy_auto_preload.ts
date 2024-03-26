import {Component, lazy} from "solid-js";
import {isDEV} from "./dev_mode";

const componentsToPreload: {preload: () => Promise<unknown>}[] = [];

let preloadTimer: ReturnType<typeof setTimeout> | undefined;

/** Idle time after which to preload. */
const PRELOAD_INTERVAL_MILLIS = 1000;

/** Wait the interval, then preload one component, and repeat. */
function schedulePreload() {
  clearTimeout(preloadTimer);
  preloadTimer = setTimeout(async () => {
    const comp = componentsToPreload.shift();
    if (comp) {
      await comp.preload();
      schedulePreload();
    }
  }, PRELOAD_INTERVAL_MILLIS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyAutoPreload<T extends Component<any>>(
  fn: () => Promise<{
    default: T;
  }>,
) {
  const lazyComponent = lazy(fn);
  componentsToPreload.push(lazyComponent);
  if (!isDEV()) {
    // Preload only in non-DEV mode. In DEV mode the ongoing fetches interfere with debugging.
    schedulePreload();
  }
  return lazyComponent;
}
