import {Middleware, MiddlewareData} from "@floating-ui/core";
import {
  autoUpdate,
  AutoUpdateOptions,
  ClientRectObject,
  computePosition,
  ComputePositionConfig,
  ComputePositionReturn,
  Derivable,
  ReferenceElement,
  size,
  SizeOptions,
  VirtualElement,
} from "@floating-ui/dom";
import {NON_NULLABLE} from "components/utils/array_filter";
import {Accessor, createMemo, createRenderEffect, createSignal, JSX, onCleanup, VoidComponent} from "solid-js";
import {Portal} from "solid-js/web";
import {GetRef} from "../utils/GetRef";
import {hasProp} from "../utils/props";

interface BaseProps {
  /**
   * The floating element, positioned by the Floating component. It must evaluate to a single
   * (or none) HTMLElement. It will be displayed, placed in a <Portal>.
   *
   * Example:
   *
   *     <Floating ... floating={(posStyle) => <div style={posStyle()}>Floating</div>} />} />
   *
   * The style passed to the element initially sets its visibility to hidden, so that it doesn't
   * appear while the position is being calculated. Then it switches to setting the correct CSS
   * position, left and top.
   */
  readonly floating: (
    posStyle: Accessor<JSX.CSSProperties>,
    computed: Accessor<ComputePositionReturn | undefined>,
  ) => JSX.Element;
  readonly options?: Partial<ComputePositionConfig>;
  /** The auto update options to use. Boolean values enable/disable auto update using default options. Default: true. */
  readonly autoUpdate?: boolean | AutoUpdateOptions;
}

interface PropsWithReference extends BaseProps {
  /**
   * The reference element. It must evaluate to a single (or none) HTMLElement. It is displayed, and
   * used as the reference element for the floating element.
   *
   * Example:
   *
   *     <Floating reference={<Button ref={ref}>Reference</Button>} ... />
   */
  readonly reference: JSX.Element;
}

interface PropsWithExternalReference extends BaseProps {
  /**
   * The external or virtual reference element. It is not displayed by this component, but only used
   * as the reference element for the floating element.
   */
  readonly externalReference: HTMLElement | VirtualElement | undefined;
}

type Props = PropsWithReference | PropsWithExternalReference;

/**
 * This component displays an element floating near a reference element, positioned using the
 * floating-ui library.
 */
export const Floating: VoidComponent<Props> = (props) => {
  const [computed, setComputed] = createSignal<ComputePositionReturn>();
  const [referenceElement, setReferenceElement] = createSignal<ReferenceElement>();
  function getRefElement(elem: HTMLElement | undefined): ReferenceElement | undefined {
    if (!elem || elem.getClientRects().length) {
      return elem;
    } else {
      // This element does not have own size. Try using its children to determine the size.
      return {
        getBoundingClientRect() {
          const rects = elem.getClientRects();
          if (rects.length) {
            return elem.getBoundingClientRect();
          }
          const childrenRects = Array.from(elem.children, (ch) =>
            ch instanceof HTMLElement ? getRefElement(ch)!.getBoundingClientRect() : undefined,
          ).filter(NON_NULLABLE);
          return childrenRects.length ? boundingRect(childrenRects) : elem.getBoundingClientRect();
        },
        contextElement: elem,
      } satisfies VirtualElement;
    }
  }
  const displayedReference = createMemo(() => {
    if (hasProp(props as PropsWithReference, "reference")) {
      return (
        <GetRef ref={(ref) => setReferenceElement(getRefElement(ref))} waitForMount>
          {(props as PropsWithReference).reference}
        </GetRef>
      );
    } else {
      setReferenceElement(() => (props as PropsWithExternalReference).externalReference);
      return undefined;
    }
  });
  const [floatingElement, setFloatingElement] = createSignal<HTMLElement>();
  const posStyle = createMemo((): JSX.CSSProperties => {
    const pos = computed();
    return pos
      ? {
          ...middleware.reactiveSize.getData(pos.middlewareData)?.floatingStyle,
          position: pos.strategy,
          left: `${pos.x}px`,
          top: `${pos.y}px`,
        }
      : {"visibility": "hidden", "pointer-events": "none"};
  });
  createRenderEffect(() => {
    if (referenceElement() && floatingElement()) {
      const refElement = referenceElement()!;
      const floatElement = floatingElement()!;
      function updatePosition() {
        void computePosition(refElement, floatElement, props.options).then(setComputed);
      }
      if (props.autoUpdate === false) {
        updatePosition();
      } else {
        const autoUpdateCleanup = autoUpdate(
          refElement,
          floatElement,
          updatePosition,
          typeof props.autoUpdate === "object" ? props.autoUpdate : undefined,
        );
        onCleanup(autoUpdateCleanup);
      }
    } else {
      setComputed(undefined);
    }
  });
  return (
    <>
      {displayedReference()}
      <Portal>
        <GetRef ref={setFloatingElement}>{props.floating(posStyle, computed)}</GetRef>
      </Portal>
    </>
  );
};

function boundingRect(rects: ClientRectObject[]): DOMRect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return DOMRect.fromRect({x, y, width: right - x, height: bottom - y});
}

export namespace middleware {
  type SizeStateArg = Parameters<NonNullable<SizeOptions["apply"]>>[0];

  interface ReactiveSizeOptions extends Omit<SizeOptions, "apply"> {
    /** Returns the style that should be applied to the floating element. */
    getFloatingStyle?: (state: SizeStateArg) => JSX.CSSProperties;
  }

  interface ReactiveSizeData {
    /** The underlying builtin size middleware. */
    readonly baseSize: Middleware;
    readonly floatingStyle?: JSX.CSSProperties;
  }

  export const REACTIVE_SIZE_NAME = "reactiveSize";

  /**
   * Middleware for controlling the size of the floating element, similar to the builtin size middleware,
   * but operating in a reactive way. Instead of the `apply` function, there is a `getFloatingStyle`
   * function returning the desired style. The style is then returned as `posStyle` by the Floating
   * component.
   *
   * Might not work correctly if auto-update is disabled.
   */
  export function reactiveSize(options: ReactiveSizeOptions | Derivable<ReactiveSizeOptions>): Middleware {
    return {
      name: REACTIVE_SIZE_NAME,
      options,
      fn: async (state) => {
        let floatingStyle: JSX.CSSProperties | undefined;
        const calculatedOptions = typeof options === "function" ? options(state) : options;
        let thisState = reactiveSize.getData(state.middlewareData);
        if (!thisState?.baseSize) {
          thisState = {
            baseSize: size({
              ...calculatedOptions,
              apply: (state) => {
                floatingStyle = calculatedOptions.getFloatingStyle?.(state);
              },
            }),
          };
          state.middlewareData[REACTIVE_SIZE_NAME] = thisState;
        }
        await thisState.baseSize.fn(state);
        return {
          data: {...thisState, floatingStyle} satisfies ReactiveSizeData,
          // Never return the reset. If the style changes the floating element, the next change
          // will be triggered by auto-update. Returning the reset signal doesn't help because
          // the style is not applied before running the middlewares again.
        };
      },
    };
  }

  reactiveSize.getData = (data: MiddlewareData) => data[REACTIVE_SIZE_NAME] as ReactiveSizeData | undefined;

  /** A function for `getFloatingStyle` limiting the maximum size of the floating element. */
  reactiveSize.getMaxSizeStyle = (
    {rects, availableWidth, availableHeight}: SizeStateArg,
    {
      maxWidth = Number.POSITIVE_INFINITY,
      maxHeight = Number.POSITIVE_INFINITY,
    }: {maxWidth?: number; maxHeight?: number} = {},
  ): JSX.CSSProperties => {
    const availW = Math.min(availableWidth, maxWidth);
    const availH = Math.min(availableHeight, maxHeight);
    return {
      "box-sizing": "border-box",
      // Use some margin of error to avoid infinite loops caused by rounding.
      "max-width": availW < rects.floating.width + 1 ? `${Math.max(0, availW)}px` : undefined,
      "max-height": availH < rects.floating.height + 1 ? `${Math.max(0, availH)}px` : undefined,
    };
  };

  /** A function for `getFloatingStyle` setting the minimum floating width to the reference width. */
  reactiveSize.getMatchWidthStyle = ({rects}: SizeStateArg): JSX.CSSProperties => ({
    "min-width": `${rects.reference.width}px`,
  });
}
