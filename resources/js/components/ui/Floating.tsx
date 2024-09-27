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
  const displayedReference = createMemo(() => {
    if (hasProp(props as PropsWithReference, "reference")) {
      return <GetRef ref={setReferenceElement}>{(props as PropsWithReference).reference}</GetRef>;
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
        computePosition(refElement, floatElement, props.options).then(setComputed);
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
