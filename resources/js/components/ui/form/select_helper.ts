import {Accessor, mergeProps} from "solid-js";
import {SelectBaseProps, SelectProps} from "./Select";

/**
 * Merges two parts of the props for the Select component.
 *
 * This function merges props, but ensures type correctness at the same time, which
 * is not trivial because of the `multiple` prop. Discriminating union seems not to work very well
 * in some situations.
 *
 * Example usage:
 *
 *     const items = createMemo(() => ...);
 *     const mergedSelectProps = mergeSelectProps<"items">(someSelectProps, {items});
 *     return <Select {...mergedSelectProps} />;
 */
export function mergeSelectProps<K extends keyof SelectBaseProps>(
  props: Omit<SelectProps, K>,
  other: {[k in K]: Accessor<SelectProps[k]>},
): SelectProps {
  const otherProps = {};
  for (const [k, v] of Object.entries(other) as [K, Accessor<SelectProps[K]>][]) {
    Object.defineProperty(otherProps, k, {get: v});
  }
  const mergedProps = mergeProps(props, otherProps);
  return mergedProps as SelectProps;
}
