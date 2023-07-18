import {ImSpinner2} from "solid-icons/im";
import {Component, mergeProps} from "solid-js";

interface Props {
  size?: number | keyof typeof SIZES;
  center?: boolean;
}

const SIZES = {
  small: 16,
  large: 50,
};

const DEFAULTS: Required<Props> = {
  size: "large",
  center: true,
};

/** The loading spinner used across the app. */
export const Spinner: Component<Props> = props => {
  const mProps = mergeProps(DEFAULTS, props);
  const size = () => typeof mProps.size === "number" ? mProps.size : SIZES[mProps.size];
  return <div class={mProps.center ? "flex justify-center items-center" : ""}>
    <ImSpinner2 size={size()} class="animate-spin" />
  </div>;
};
