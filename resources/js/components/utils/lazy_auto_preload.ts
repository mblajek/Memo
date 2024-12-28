import {Component, createSignal, lazy} from "solid-js";
import {isDEV} from "./dev_mode";

const componentPreloadFuncs: (() => Promise<unknown>)[] = [];

let preloadTimer: ReturnType<typeof setTimeout> | undefined;

const [modulesInfo, setModulesInfo] = createSignal<ReadonlyMap<string, ModuleInfo>>(new Map());

export const getPreloadedModulesInfo = modulesInfo;

interface ModuleInfo {
  preload(): void;
  readonly loaded: boolean;
  readonly preloaded: boolean;
  readonly used: boolean;
}

/** Idle time after which to preload. */
const PRELOAD_INTERVAL_MILLIS = 2000;

/** Wait the interval, then preload one component, and repeat. */
function schedulePreload() {
  clearTimeout(preloadTimer);
  preloadTimer = setTimeout(async () => {
    const preload = componentPreloadFuncs.shift();
    if (preload) {
      await preload();
      schedulePreload();
    }
  }, PRELOAD_INTERVAL_MILLIS);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyAutoPreload<T extends Component<any>>(fn: () => Promise<{default: T}>) {
  const str = fn.toString();
  const name = str.match(/\bimport\("(?:\/resources\/js\/)(.+?)"\)/)?.[1] || str;
  setModulesInfo((prev) =>
    new Map(prev).set(name, {preload: () => undefined, loaded: false, preloaded: false, used: false}),
  );
  function updateInfo(update: Partial<ModuleInfo>) {
    setModulesInfo((prev) => new Map(prev).set(name, {...prev.get(name)!, ...update}));
  }
  const lazyComponent = lazy(() => {
    updateInfo({loaded: true});
    return fn();
  });
  const preload = async () => {
    updateInfo({preloaded: true});
    return await lazyComponent.preload();
  };
  updateInfo({preload});
  const lazyAutoPreloadComponent = Object.assign(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => {
      updateInfo({used: true});
      return lazyComponent(props);
    },
    lazyComponent,
    {preload},
  );
  componentPreloadFuncs.push(preload);
  if (!isDEV()) {
    // Preload only in non-DEV mode. In DEV mode the ongoing fetches interfere with debugging.
    schedulePreload();
  }
  return lazyAutoPreloadComponent as typeof lazyComponent;
}
