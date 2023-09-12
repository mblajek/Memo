import {Component, JSX, splitProps} from "solid-js";
import {cx} from "../utils";

interface Props extends JSX.HTMLAttributes<HTMLSpanElement> {
  text?: string;
  capitalize?: boolean;
}

/** Displays a span with the specified text with its first letter capitalised using CSS. */
export const Capitalize: Component<Props> = (props) => {
  const [localProps, spanProps] = splitProps(props, ["text", "capitalize"]);
  return (
    <span
      {...spanProps}
      class={cx(spanProps.class, "inline-block", {"first-letter:capitalize": localProps.capitalize ?? true})}
    >
      {localProps.text}
    </span>
  );
};
