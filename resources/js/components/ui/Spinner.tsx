import {IconProps} from "solid-icons";
import {ImSpinner2} from "solid-icons/im";
import {VoidComponent} from "solid-js";
import {htmlAttributes} from "../utils";

/** The loading spinner used across the app. */
export const BigSpinner: VoidComponent = () => (
  <div class="flex justify-center items-center">
    <ImSpinner2 size={50} class="animate-spin m-4" />
  </div>
);

export const SmallSpinner: VoidComponent<IconProps> = (props) => (
  <span class="mx-0.5">
    <ImSpinner2 size="0.9em" {...htmlAttributes.merge(props, {class: "inlineIcon animate-spin"})} />
  </span>
);
