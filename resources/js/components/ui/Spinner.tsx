import {ImSpinner2} from "solid-icons/im";
import {Component} from "solid-js";

const SIZES = {
  small: 16,
  large: 50,
}

/** The loading spinner used across the app. */
export const Spinner: Component<{size: number | keyof typeof SIZES}> = props => {
  return <ImSpinner2
    size={typeof props.size === "number" ? props.size : SIZES[props.size]}
    class="animate-spin"
  />
};
