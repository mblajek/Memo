import {Accessor, createEffect, onCleanup} from "solid-js";

type LoadType = "initial" | "popstate";

/**
 * Creates a history persistence.
 *
 * The value is stored in history state. On navigation forward/back, the onLoad function is called with the restored value.
 *
 * TODO: Support e.g. Ctrl+back to navigate back in a new tab, by providing the URL to history.replaceState.
 */
export function createHistoryPersistence<T>({
  key,
  value,
  onLoad,
}: {
  key: string;
  value: Accessor<T>;
  onLoad: (value: T, type: LoadType) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function loadIfPresent(state: any, type: LoadType) {
    const stored = (state as Record<string, unknown> | null)?.[key] as T | undefined;
    if (stored !== undefined) {
      onLoad(stored, type);
    }
  }
  loadIfPresent(history.state, "initial");
  const popStateHandler = (e: PopStateEvent) => loadIfPresent(e.state, "popstate");
  addEventListener("popstate", popStateHandler);
  onCleanup(() => removeEventListener("popstate", popStateHandler));
  createEffect(() => history.replaceState({...history.state, [key]: value()}, ""));
}

export function clearAllHistoryState() {
  history.replaceState(null, "");
}
