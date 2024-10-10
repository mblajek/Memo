import {Accessor, createComputed, createSignal, on, onCleanup} from "solid-js";
import {createCached} from "./cache";

export type Size = readonly [number, number];

export const useResizeObserver = createCached(() => {
  const callbacks = new Map<Element, (entry: ResizeObserverEntry) => void>();
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      callbacks.get(entry.target)?.(entry);
    }
  });
  onCleanup(() => resizeObserver.disconnect());

  function observe<E extends HTMLElement, T>(
    element: Accessor<E | undefined>,
    func: (entry: ResizeObserverEntry) => T,
    init?: T | ((element: E) => T),
  ): Accessor<T | undefined> {
    const [signal, setSignal] = createSignal<T>();
    createComputed(
      on(element, (element) => {
        setSignal(() =>
          init === undefined
            ? undefined
            : typeof init === "function"
              ? element
                ? (init as (element: E) => T)(element)
                : undefined
              : init,
        );
        if (element) {
          callbacks.set(element, (entry) => setSignal(() => func(entry)));
          resizeObserver.observe(element);
          onCleanup(() => {
            resizeObserver.unobserve(element);
            callbacks.delete(element);
          });
        }
      }),
    );
    return signal;
  }

  function observeTarget<E extends HTMLElement, T>(
    element: Accessor<E | undefined>,
    func: (element: E) => T,
  ): Accessor<T | undefined> {
    return observe(
      element,
      (entry) => func(entry.target as E),
      (element) => func(element),
    );
  }

  function observeClientSize<E extends HTMLElement>(element: Accessor<E | undefined>) {
    return observeTarget<E, Size>(element, (element) => [element.clientWidth, element.clientHeight]);
  }

  function observeBoundingClientRect<E extends HTMLElement>(element: Accessor<E | undefined>) {
    return observeTarget<E, DOMRectReadOnly>(element, (element) => element.getBoundingClientRect());
  }

  return {observe, observeTarget, observeClientSize, observeBoundingClientRect};
});

const [getWindowSize, setWindowSize] = createSignal<Size>([window.innerWidth, window.innerHeight]);

addEventListener("resize", () => setWindowSize([window.innerWidth, window.innerHeight]));

export const windowSize = getWindowSize;

/** A function that creates a dependence on the window size when used in a computation. */
export function reactToWindowResize() {
  getWindowSize();
}
