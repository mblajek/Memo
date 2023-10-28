import {VoidComponent, splitProps} from "solid-js";
import {htmlAttributes, cx} from "../utils";

interface Props extends htmlAttributes.span {
  text?: string;
  capitalize?: boolean;
}

/** Displays a span with the specified text with its first letter capitalised using CSS. */
export const Capitalize: VoidComponent<Props> = (props) => {
  const [localProps, spanProps] = splitProps(props, ["text", "capitalize"]);
  return (
    <span
      {...htmlAttributes.merge(spanProps, {
        class: cx("inline-block", {"first-letter:capitalize": localProps.capitalize ?? true}),
      })}
    >
      {localProps.text}
    </span>
  );
};
