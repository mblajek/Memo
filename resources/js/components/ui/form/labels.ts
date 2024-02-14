import {JSX} from "solid-js";

export type LabelOverride = JSX.Element | ((originalLabel: JSX.Element) => JSX.Element);

/**
 * Returns the label override, if it completely overrides any original label. This is the case when
 * the override is a JSX.Element, or a function that doesn't take a parameter.
 *
 * This can be used to optimise calculating the label by skipping calculation of the original label
 * in case it is not needed.
 */
export function getDirectLabelOverride(labelOverride?: LabelOverride): (() => JSX.Element) | undefined {
  return labelOverride === undefined
    ? undefined
    : typeof labelOverride === "function"
      ? labelOverride.length
        ? undefined
        : (labelOverride as () => JSX.Element)
      : () => labelOverride;
}

/** Returns the label, with the optional override applied. */
export function applyLabelOverride(originalLabel: JSX.Element, labelOverride?: LabelOverride): JSX.Element {
  return labelOverride === undefined
    ? originalLabel
    : typeof labelOverride === "function"
      ? labelOverride(originalLabel)
      : labelOverride;
}
