import {VoidComponent} from "solid-js";

import {BsExclamationCircleFill} from "solid-icons/bs";
import {IconProps} from "solid-toast";
import {htmlAttributes} from "../utils";

export const WarningMark: VoidComponent<IconProps> = (props) => {
  return (
    <BsExclamationCircleFill
      {...htmlAttributes.merge(props, {
        class: "inline-block mb-2 text-red-600",
        size: "12",
      })}
    />
  );
};
