import {
  Component,
  JSX,
  ParentComponent,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  mergeProps,
  splitProps,
} from "solid-js";
import {cx} from "./classnames";
import {htmlAttributes} from "./html_attributes";

interface Props extends Omit<htmlAttributes.div, "children"> {
  /** The id of the currently active target. */
  readonly activeId: string | undefined;
  readonly markerClass: (markerInfo: MarkerInfo) => string | undefined;
  readonly transitionDurationMillis?: number;
  readonly transitionTimingFunction?: string;
  /** The function producing the children, including any number of potential marker target elements. */
  readonly children: (MarkerTarget: ParentComponent<MarkerTargetProps>) => JSX.Element;
}

interface MarkerInfo {
  readonly static: boolean;
  readonly sliding: boolean;
  readonly active: boolean;
}

interface MarkerTargetProps extends htmlAttributes.div {
  readonly id: string;
}

const DEFAULT_PROPS = {
  transitionDurationMillis: 200,
} satisfies Partial<Props>;

/**
 * A container for a tracking marker, pointing to one of the elements inside. Useful for implementing
 * components like a segmented control or tabs controller with animation on switching the active segment/tab.
 *
 * During the transition, an absolutely positioned marker is displayed (sliding marker), with CSS transition
 * going from the previous target to the next. When not transitioning, the sliding marker is hidden, and
 * the target just receives a class that makes it look like a marker (static marker).
 * This allows the marker to track the size and position of the target without updating the marker position in a loop.
 */
export const TrackingMarker: Component<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, divProps] = splitProps(defProps, [
    "activeId",
    "markerClass",
    "transitionDurationMillis",
    "transitionTimingFunction",
    "children",
  ]);
  const targets = new Map<string, HTMLDivElement>();
  const [isTransitioning, setIsTransitioning] = createSignal(false);
  let containerDiv: HTMLDivElement | undefined;
  let markerDiv: HTMLDivElement | undefined;

  function setMarkerPos(activeId = props.activeId) {
    if (activeId && containerDiv && markerDiv) {
      const target = targets.get(activeId);
      if (target) {
        const containerRect = containerDiv.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        markerDiv.style.left = `${targetRect.left - containerRect.left}px`;
        markerDiv.style.top = `${targetRect.top - containerRect.top}px`;
        markerDiv.style.width = `${targetRect.width}px`;
        markerDiv.style.height = `${targetRect.height}px`;
      }
    }
  }

  let transitionEndTimerId: ReturnType<typeof setTimeout> | undefined;
  createRenderEffect<string | undefined>((prevActiveId) => {
    if (props.activeId !== prevActiveId) {
      clearTimeout(transitionEndTimerId);
      if (prevActiveId) {
        setMarkerPos(prevActiveId);
        setIsTransitioning(true);
        transitionEndTimerId = setTimeout(() => setIsTransitioning(false), props.transitionDurationMillis + 10);
        function loop() {
          setMarkerPos();
          if (isTransitioning()) {
            requestAnimationFrame(loop);
          }
        }
        requestAnimationFrame(loop);
      } else {
        setMarkerPos();
      }
    }
    return props.activeId;
  });

  const MarkerTarget: ParentComponent<MarkerTargetProps> = (allTargetProps) => {
    const [targetProps, divProps] = splitProps(allTargetProps, ["id", "children"]);
    const [div, setDiv] = createSignal<HTMLDivElement>();
    const isActive = createMemo(() => props.activeId === targetProps.id && !isTransitioning());
    createEffect(() => {
      if (div()) {
        targets.set(targetProps.id, div()!);
      }
    });
    return (
      <div
        ref={setDiv}
        {...htmlAttributes.merge(divProps, {
          class: props.markerClass({static: true, sliding: false, active: isActive()}),
        })}
      >
        {targetProps.children}
      </div>
    );
  };

  const isSliding = createMemo(() => !!props.activeId && isTransitioning());
  return (
    <div ref={containerDiv} {...htmlAttributes.merge(divProps, {class: "relative"})}>
      <div
        ref={markerDiv}
        class={cx(
          "absolute pointer-events-none",
          props.markerClass({static: false, sliding: true, active: isSliding()}),
          isSliding() ? undefined : "invisible",
        )}
        style={
          isTransitioning()
            ? {
                "transition-property": "left, top, width, height",
                "transition-duration": `${props.transitionDurationMillis}ms`,
                "transition-timing-function": props.transitionTimingFunction,
              }
            : undefined
        }
      />
      {props.children(MarkerTarget)}
    </div>
  );
};
