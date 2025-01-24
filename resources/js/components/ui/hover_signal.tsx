import {htmlAttributes} from "components/utils/html_attributes";
import {Accessor, createEffect, createSignal, on, onCleanup} from "solid-js";
import "tippy.js/animations/shift-toward-subtle.css";
import "tippy.js/dist/border.css";
import "tippy.js/dist/tippy.css";
import {useEventListener} from "../utils/event_listener";
import "./title.scss";

declare module "solid-js" {
  namespace JSX {
    interface DirectiveFunctions {
      hoverSignal: typeof hoverSignal;
    }
  }
}

type HoverSetter = (hover: boolean) => void;
export type HoverSignal = Accessor<boolean> & {setHover: HoverSetter};

export function createHoverSignal() {
  const [hover, setHover] = createSignal(false);
  const hoverSignal = hover as HoverSignal;
  hoverSignal.setHover = setHover;
  return hoverSignal;
}

type HoverSignalInput = HoverSetter | HoverSignal | undefined;

function getSetterFunc(input: HoverSignalInput) {
  return (input as HoverSignal | undefined)?.setHover || (input as HoverSetter | undefined);
}

/**
 * A utility for getting the hovered signal of an element.
 *
 * Usage:
 *
 *     import {hoverSignal} from "components/ui/hover_signal";
 *     // ...
 *     type _Directives = typeof hoverSignal; // Avoid import auto-removal and support tree-shaking.
 *     // ...
 *     const hover = createHoverSignal();
 *     // ...
 *     <element use:hoverSignal={hover} />
 *     <Show when={hover()}>...</Show>
 */
export function hoverSignal(element: HTMLElement, accessor: Accessor<HoverSignalInput>) {
  createEffect(
    on(accessor, (input) => {
      const setHover = getSetterFunc(input);
      if (setHover) {
        useEventListener(element, "pointerenter", () => setHover(true));
        useEventListener(element, "pointerleave", () => setHover(false));
        onCleanup(() => setHover(false));
      }
    }),
  );
}

/**
 * A utility for getting the hovered signal of an element.
 *
 * Usage:
 *
 *     const hover = createHoverSignal();
 *     // ...
 *     <element {...hoverEvents(hover)} />
 *     <Show when={hover()}>...</Show>
 */
export function hoverEvents(signal: HoverSignalInput) {
  const setHover = getSetterFunc(signal);
  return {
    onPointerEnter: () => setHover?.(true),
    onPointerLeave: () => setHover?.(false),
  } satisfies htmlAttributes.div;
}
