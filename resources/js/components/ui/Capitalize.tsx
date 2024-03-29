import {VoidComponent, splitProps} from "solid-js";
import {cx, htmlAttributes} from "../utils";

interface Props extends htmlAttributes.span {
  readonly text: string | undefined;
  readonly capitalize?: boolean;
}

/** Displays a span with the specified text with its first letter capitalised using CSS. */
export const Capitalize: VoidComponent<Props> = (allProps) => {
  const [props, spanProps] = splitProps(allProps, ["text", "capitalize"]);
  return (
    <span
      {...htmlAttributes.merge(spanProps, {
        class: cx("inline-block", {"first-letter:capitalize": props.capitalize ?? true}),
      })}
    >
      {props.text}
    </span>
  );
};

/**
 * Capitalizes the first letter of the string.
 * Consider using the Capitalize component instead, if possible.
 */
export function capitalizeString(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
