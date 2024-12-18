import {ChildrenOrFunc, getChildrenElement} from "components/ui/children_func";
import {createMemo, on} from "solid-js";

interface Props<T> {
  readonly signal: T;
  readonly children: ChildrenOrFunc<[T]>;
}

/** Recreates the children every time the signal is changed. */
export const Recreator = <T,>(props: Props<T>) => {
  const content = createMemo(
    on(
      () => props.signal,
      (signal) => getChildrenElement(props.children, signal),
    ),
  );
  return <>{content()}</>;
};
