import {Accessor, Component, createMemo, mergeProps, Show, splitProps} from "solid-js";
import {delayedAccessor, htmlAttributes} from "../utils";
import {ChildrenOrFunc, getChildrenElement} from "./children_func";

interface Props extends Omit<htmlAttributes.div, "children"> {
  readonly show: unknown;
  readonly transitionTimeMs?: number;
  readonly transitionTimingFunction?: string;
  readonly destroyWhenFullyCollapsed?: boolean;
  readonly children: ChildrenOrFunc<[ChildrenArgs]>;
}

interface ChildrenArgs {
  readonly show: Accessor<boolean>;
  readonly fullyCollapsed: Accessor<boolean>;
  readonly fullyExpanded: Accessor<boolean>;
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
export const HideableSection: Component<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, divProps] = splitProps(defProps, [
    "show",
    "transitionTimeMs",
    "transitionTimingFunction",
    "destroyWhenFullyCollapsed",
    "children",
  ]);
  const show = createMemo(() => !!props.show);
  let div: HTMLDivElement | undefined;
  // eslint-disable-next-line solid/reactivity
  const fullyExpanded = delayedAccessor(show, {
    timeMs: () => props.transitionTimeMs,
    outputImmediately: (show) => !show,
  });
  // eslint-disable-next-line solid/reactivity
  const fullyCollapsed = delayedAccessor(show, {
    timeMs: () => props.transitionTimeMs,
    outputImmediately: (show) => show,
  });
  /** The show signal, delayed by epsilon. See doc for maxHeight for description. */
  // eslint-disable-next-line solid/reactivity
  const showDelayedByEpsilon = delayedAccessor(show, {timeMs: 20});
  /**
   * The current max-height. The logic:
   * - If the section is fully opened, it is unset to allow auto height.
   * - If it is opening, it is set to scrollHeight and relies on transition for animation.
   * - If it is closing, for the first epsilon time it is set to scrollHeight so that the
   *   initial value for transition is locked in, and after that it is zero and relies on
   *   transition for animation.
   */
  const maxHeight = () => (fullyExpanded() ? undefined : showDelayedByEpsilon() ? `${div?.scrollHeight}px` : "0");
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
      <Show when={!props.destroyWhenFullyCollapsed || !!fullyCollapsed()}>
        {getChildrenElement(props.children, {show, fullyCollapsed, fullyExpanded})}
      </Show>
    </div>
  );
};
