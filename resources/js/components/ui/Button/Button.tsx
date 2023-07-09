import { Button as KButton } from "@kobalte/core";
import { Component, JSX, mergeProps, splitProps } from "solid-js";

/**
 * @todo custom props and styles
 */
export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button: Component<ButtonProps> = (props) => {
  const mergedProps = mergeProps<ButtonProps[]>(props);
  const [, otherProps] = splitProps(mergedProps, []);
  return <KButton.Root {...otherProps} />;
};
