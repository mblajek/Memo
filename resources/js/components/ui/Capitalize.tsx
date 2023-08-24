import {Component} from "solid-js";

/** Displays a span with the specified text with its first letter capitalised using CSS. */
export const Capitalize: Component<{text?: string}> = (props) => (
  <span class="inline-block first-letter:capitalize">{props.text}</span>
);
