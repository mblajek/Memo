import { Button as KButton } from "@kobalte/core";
import { Component, mergeProps, splitProps } from "solid-js";

/**
 * @todo custom props and styles
 */
export interface ButtonProps extends KButton.ButtonRootProps {}

export const Button: Component<ButtonProps> = (props) => {
  const mergedProps = mergeProps<ButtonProps[]>(props);
  const [, otherProps] = splitProps(mergedProps, []);
  return <KButton.Root {...otherProps} />;
};
