import {ComputePositionConfig, DetectOverflowOptions, flip, offset, shift} from "@floating-ui/dom";
import {Component, JSX, Show, createSignal} from "solid-js";
import {useEventListener} from "../utils/event_listener";
import {GetRef} from "../utils/GetRef";
import {ChildrenOrFunc, getChildrenElement} from "./children_func";
import {Floating, middleware} from "./Floating";

interface Props {
  /** The trigger button. It must return a single HTMLElement. */
  readonly trigger: (popOver: PopOverControl) => JSX.Element;
  readonly placement?: Partial<ComputePositionConfig>;
  readonly children: ChildrenOrFunc<[PopOverControl]>;
  readonly popOverClass?: string;
}

export interface PopOverControl {
  isOpen: boolean;
  setOpen(open?: boolean): void;
  open(): void;
  close(): void;
  toggle(): void;
}

const DETECT_OVERFLOW_OPTIONS = {
  padding: 5,
} satisfies DetectOverflowOptions;

const DEFAULT_PLACEMENT: Partial<ComputePositionConfig> = {
  placement: "bottom-end",
  middleware: [
    offset({mainAxis: 1}),
    shift(DETECT_OVERFLOW_OPTIONS),
    flip({crossAxis: false, ...DETECT_OVERFLOW_OPTIONS}),
    middleware.reactiveSize({getFloatingStyle: middleware.reactiveSize.getMaxSizeStyle, ...DETECT_OVERFLOW_OPTIONS}),
  ],
};

export const PopOver: Component<Props> = (props) => {
  const [open, setOpen] = createSignal(false);
  const popOver: PopOverControl = {
    get isOpen() {
      return open();
    },
    setOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open()),
  };
  return (
    <Floating
      reference={props.trigger(popOver)}
      floating={(posStyle) => {
        let floatingRef: HTMLElement | undefined;
        useEventListener(
          document,
          "click",
          (e) => {
            if (floatingRef && !e.composedPath().includes(floatingRef)) {
              // Use timeout to close even if it is the trigger button that was clicked.
              setTimeout(() => setOpen(false));
            }
          },
          {capture: true},
        );
        return (
          <GetRef
            ref={(v) => {
              floatingRef = v;
            }}
          >
            <Show when={open()}>
              <div
                class={
                  props.popOverClass ||
                  "z-dropdown max-w-fit bg-white border border-gray-700 rounded shadow-xl flex flex-col"
                }
                style={posStyle()}
              >
                {getChildrenElement(props.children, popOver)}
              </div>
            </Show>
          </GetRef>
        );
      }}
      options={{...DEFAULT_PLACEMENT, ...props.placement}}
    />
  );
};
