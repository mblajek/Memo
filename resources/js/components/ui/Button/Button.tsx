import {Button as KButton} from "@kobalte/core";
import {Component, JSX} from "solid-js";

export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Wrapper for a button.
 *
 * The main functionality for now is type="button" by default, other props can be added as needed.
 */
export const Button: Component<ButtonProps> = (props) => {
  return <KButton.Root {...props} />;
};
