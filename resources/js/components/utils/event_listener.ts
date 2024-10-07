import {onCleanup} from "solid-js";

export function useEventListener<K extends keyof WindowEventMap>(
  target: EventTarget,
  type: K,
  listener: (ev: WindowEventMap[K]) => unknown,
  options?: AddEventListenerOptions,
) {
  target.addEventListener(type, listener as (e: Event) => unknown, options);
  onCleanup(() => target.removeEventListener(type, listener as (e: Event) => unknown, options));
}
