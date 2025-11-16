import {ComputePositionConfig, DetectOverflowOptions, flip, offset, shift} from "@floating-ui/dom";
import {style} from "components/ui/inline_styles";
import {Component, JSX, Show, createSignal, onCleanup} from "solid-js";
import {useEventListener} from "../utils/event_listener";
import {GetRef} from "../utils/GetRef";
import {ChildrenOrFunc, getChildrenElement} from "./children_func";
import {Floating, middleware} from "./Floating";

interface Props {
  /** The trigger button. It must return a single HTMLElement. */
  readonly trigger: (popOver: PopOverControl) => JSX.Element;
  readonly placement?: Partial<ComputePositionConfig>;
  readonly children: ChildrenOrFunc<[PopOverControl]>;
  /** The parent pop-over that should not close when the inside of this pop-over's floating element is clicked. */
  readonly parentPopOver?: PopOverControl;
}

export interface PopOverControl {
  readonly isOpen: boolean;
  setOpen(open?: boolean): void;
  open(): void;
  close(): void;
  toggle(): void;
  /**
   * Registers an element that is treated as part of the floating content, even if it's not inside it,
   * so that clicking it won't close the pop-over. The element is removed in onCleanup.
   */
  addExternalContent(content: HTMLElement): void;
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
  const externalContent: HTMLElement[] = [];
  const popOver: PopOverControl = {
    get isOpen() {
      return open();
    },
    setOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open()),
    addExternalContent: (content) => {
      externalContent.push(content);
      onCleanup(() => externalContent.splice(externalContent.indexOf(content), 1));
    },
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
            const composedPath = e.composedPath();
            if (
              floatingRef &&
              !composedPath.includes(floatingRef) &&
              !externalContent.some((c) => composedPath.includes(c))
            ) {
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
              if (floatingRef) {
                props.parentPopOver?.addExternalContent(floatingRef);
              }
            }}
          >
            <Show when={open()}>
              <div
                class="z-dropdown max-w-fit bg-white border border-gray-700 rounded shadow-xl flex flex-col overflow-clip"
                {...style(posStyle())}
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
