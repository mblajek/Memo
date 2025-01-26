import {ChildrenOrFunc, getChildrenElement} from "components/ui/children_func";
import {Show} from "solid-js";

interface Props<T> {
  readonly signal: T;
  readonly children: ChildrenOrFunc<[T]>;
}

/** Recreates the children every time the signal is changed. */
export const Recreator = <T,>(props: Props<T>) => (
  <Show keyed when={[props.signal] as const}>
    {([signal]) => getChildrenElement(props.children, signal)}
  </Show>
);
