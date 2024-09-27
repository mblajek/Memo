import {
  autoUpdate,
  AutoUpdateOptions,
  computePosition,
  ComputePositionConfig,
  ComputePositionReturn,
  ReferenceElement,
  VirtualElement,
} from "@floating-ui/dom";
import {Accessor, createMemo, createRenderEffect, createSignal, JSX, onCleanup, VoidComponent} from "solid-js";

/** An object that needs to be passed as the ref attribute to some element. */
type RefGetter = (el: HTMLElement) => void;

interface Props {
  /**
   * The reference element.
   * - If HTMLElement or VirtualElement, the Floating component does not display the reference element.
   * - If JSXElement, the element needs to set ref of its main element, and the JSX will be displayed
   *   as part of the Floating component.
   *
   * Example:
   *
   *     <Floating reference={(ref) => <Button ref={ref}>Reference</Button>} ... />
   */
  readonly reference: ((ref: RefGetter) => JSX.Element) | HTMLElement | VirtualElement | undefined;
  /**
   * The floating element, positioned by the Floating component. It needs to set ref of its main element.
   *
   * Example:
   *
   *     <Floating ...
   *       floating={(ref, posStyle) => <Portal><div ref={ref} style={posStyle()}>Floating</div>} /></Portal>} />
   *
   * Note: If the floating element is conditionally present, use showFloating instead of wrapping
   * the floating element in <Show>.
   *
   * The style passed to the element initially sets its visibility to hidden, so that it doesn't
   * appear while the position is being calculated. Then it switches to setting the correct CSS
   * position, left and top.
   */
  readonly floating: (
    ref: RefGetter,
    posStyle: Accessor<JSX.CSSProperties>,
    computePositionResult: Accessor<ComputePositionReturn | undefined>,
  ) => JSX.Element;
  /**
   * Whether the floating element should be shown. Specifying this prop is preferable to wrapping the
   * floating element in <Show> because this clears the floating reference element, and improves
   * performance. Default: true.
   */
  readonly showFloating?: boolean;
  readonly options?: Partial<ComputePositionConfig>;
  /** The auto update options to use. Boolean values enable/disable auto update using default options. Default: true. */
  readonly autoUpdate?: boolean | AutoUpdateOptions;
}

/**
 * This component displays an element floating near a reference element, positioned using the
 * floating-ui library.
 */
export const Floating: VoidComponent<Props> = (props) => {
  const [computedPosition, setComputedPosition] = createSignal<ComputePositionReturn>();
  const [referenceElement, setReferenceElement] = createSignal<ReferenceElement>();
  const referenceJSX = createMemo((): JSX.Element | undefined => {
    if (typeof props.reference === "function") {
      const jsx = props.reference(setReferenceElement);
      if (jsx == undefined) {
        setReferenceElement(undefined);
      }
      return jsx;
    } else {
      setReferenceElement(props.reference);
      return undefined;
    }
  });
  const [floatingElement, setFloatingElement] = createSignal<HTMLElement>();
  const posStyle = createMemo((): JSX.CSSProperties => {
    const pos = computedPosition();
    return pos
      ? {
          position: pos.strategy,
          left: `${pos.x}px`,
          top: `${pos.y}px`,
        }
      : {visibility: "hidden"};
  });
  const floatingJSX = createMemo((): JSX.Element | undefined => {
    if (props.showFloating ?? true) {
      const jsx = props.floating(setFloatingElement, posStyle, computedPosition);
      if (jsx == undefined) {
        setFloatingElement(undefined);
      }
      return jsx;
    } else {
      setFloatingElement(undefined);
      return undefined;
    }
  });
  createRenderEffect(() => {
    if (referenceElement() && floatingElement()) {
      const refElement = referenceElement()!;
      const floatElement = floatingElement()!;
      function updatePosition() {
        computePosition(refElement, floatElement, props.options).then(setComputedPosition);
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
      setComputedPosition(undefined);
    }
  });
  return (
    <>
      {referenceJSX()}
      {floatingJSX()}
    </>
  );
};
