import {Accessor, createEffect, createMemo, on} from "solid-js";
import "tippy.js/animations/shift-toward-subtle.css";
import "tippy.js/dist/border.css";
import "tippy.js/dist/tippy.css";
import "./title.scss";

declare module "solid-js" {
  namespace JSX {
    interface DirectiveFunctions {
      scrollIntoView: typeof scrollIntoView;
    }
  }
}

export const DEFAULT_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "nearest",
};

export function scrollIntoView(element: HTMLElement, accessor: Accessor<unknown | [unknown, ScrollIntoViewOptions]>) {
  const acc = createMemo(() => {
    const accVal = accessor();
    let signal;
    let options;
    if (Array.isArray(accVal) && accVal.length === 2 && typeof accVal[1] === "object") {
      signal = accVal[0];
      options = {...DEFAULT_SCROLL_OPTIONS, ...(accVal[1] as ScrollIntoViewOptions)};
    } else {
      signal = accVal;
      options = DEFAULT_SCROLL_OPTIONS;
    }
    return {signal, options};
  });
  createEffect(
    on(
      () => acc().signal,
      (signal) => {
        if (signal) {
          element.scrollIntoView(acc().options);
        }
      },
    ),
  );
}
