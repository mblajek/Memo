import {Component} from "solid-js";

interface Props {
  text?: string;
  capitalize?: boolean;
}

/** Displays a span with the specified text with its first letter capitalised using CSS. */
export const Capitalize: Component<Props> = (props) => (
  <span class="inline-block" classList={{"first-letter:capitalize": props.capitalize ?? true}}>
    {props.text}
  </span>
);
