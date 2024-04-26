import {ParentComponent, createMemo, mergeProps, splitProps} from "solid-js";
import {debouncedAccessor, htmlAttributes} from "../utils";

interface Props extends htmlAttributes.div {
  readonly show: unknown;
  readonly transitionTimeMs?: number;
  readonly transitionTimingFunction?: string;
}

const DEFAULT_PROPS = {
  transitionTimeMs: 200,
  transitionTimingFunction: "ease-in-out",
} satisfies Partial<Props>;

/**
 * A section of the page, with visibility controlled by the show prop.
 *
 * The section folds and unfolds with a transition.
 */
export const HideableSection: ParentComponent<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, divProps] = splitProps(defProps, ["show", "transitionTimeMs", "transitionTimingFunction", "children"]);
  const show = createMemo(() => !!props.show);
  let div: HTMLDivElement | undefined;
  /** Whether the section is fully opened. */
  // eslint-disable-next-line solid/reactivity
  const hasFullHeight = debouncedAccessor(show, {
    timeMs: () => props.transitionTimeMs,
    outputImmediately: (show) => !show,
  });
  /** The show signal, delayed by epsilon. See doc for maxHeight for description. */
  // eslint-disable-next-line solid/reactivity
  const showDelayedByEpsilon = debouncedAccessor(show, {timeMs: 20});
  /**
   * The current max-height. The logic:
   * - If the section is fully opened, it is unset to allow auto height.
   * - If it is opening, it is set to scrollHeight and relies on transition for animation.
   * - If it is closing, for the first epsilon time it is set to scrollHeight so that the
   *   initial value for transition is locked in, and after that it is zero and relies on
   *   transition for animation.
   */
  const maxHeight = () =>
    hasFullHeight() ? undefined : show() || showDelayedByEpsilon() ? `${div?.scrollHeight}px` : "0";
  return (
    <div
      ref={div}
      {...htmlAttributes.merge(divProps, {
        class: "overflow-y-hidden",
        style: {
          "transition": `max-height ${props.transitionTimeMs}ms ${props.transitionTimingFunction}`,
          "max-height": maxHeight(),
        },
      })}
    >
      {props.children}
    </div>
  );
};
