import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {Show, VoidComponent, splitProps} from "solid-js";

interface Props extends htmlAttributes.span {
  readonly text: string | undefined;
  readonly capitalize?: boolean;
}

/** Displays a span with the specified text with its first letter capitalised using CSS. */
export const Capitalize: VoidComponent<Props> = (allProps) => {
  const [props, spanProps] = splitProps(allProps, ["text", "capitalize"]);
  return (
    <Show when={props.text}>
      <span
        {...htmlAttributes.merge(spanProps, {
          class: cx("inline-block", {"first-letter:capitalize": props.capitalize ?? true}),
        })}
      >
        {props.text}
      </span>
    </Show>
  );
};

/**
 * Capitalizes the first letter of the string.
 * Consider using the Capitalize component instead, if possible.
 */
export function capitalizeString(str: string): string;
export function capitalizeString(str: string | undefined): string | undefined;
export function capitalizeString(str: string | undefined) {
  return str && str.charAt(0).toUpperCase() + str.slice(1);
}
