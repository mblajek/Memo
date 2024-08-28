import {Accessor, createComputed, createSignal, on, onCleanup} from "solid-js";

export type Size = readonly [number, number];

const callbacks = new Map<Element, (entry: ResizeObserverEntry) => void>();
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    callbacks.get(entry.target)?.(entry);
  }
});

export function observeResize<E extends HTMLElement, T>(
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

export function observeResizeTarget<E extends HTMLElement, T>(
  element: Accessor<E | undefined>,
  func: (element: E) => T,
): Accessor<T | undefined> {
  return observeResize(
    element,
    (entry) => func(entry.target as E),
    (element) => func(element),
  );
}

export function observeClientSize<E extends HTMLElement>(element: Accessor<E | undefined>) {
  return observeResizeTarget<E, Size>(element, (element) => [element.clientWidth, element.clientHeight]);
}

const [getWindowSize, setWindowSize] = createSignal<Size>([window.innerWidth, window.innerHeight]);

addEventListener("resize", () => setWindowSize([window.innerWidth, window.innerHeight]));

export const windowSize = getWindowSize;
