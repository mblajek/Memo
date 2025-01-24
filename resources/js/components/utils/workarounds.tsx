import {ChildrenOrFunc} from "components/ui/children_func";
import {Accessor, createMemo, JSX, Show} from "solid-js";

interface Show_noDoubleEvaluationProps<T> {
  readonly when: T;
  readonly children: ChildrenOrFunc<[Accessor<NonNullable<T>>]>;
  readonly fallback?: JSX.Element;
}

/**
 * A version of <Show> that is not affected by the (potential) bug where the condition is evaluated
 * twice at start if the function form is used. See https://github.com/solidjs/solid/issues/2406
 *
 * It makes sense to use this replacement if the condition is expensive to evaluate, or if
 * the condition creates JSX (e.g. it is of type JSX.Element) to avoid creating two copies of the JSX.
 */
export const Show_noDoubleEvaluation = <T,>(props: Show_noDoubleEvaluationProps<T>) => {
  const when = createMemo(() => props.when);
  return <Show {...props} when={when()} />;
};
