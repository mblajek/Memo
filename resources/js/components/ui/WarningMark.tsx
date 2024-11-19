import {VoidComponent} from "solid-js";

import {FaSolidCircleExclamation} from "solid-icons/fa";
import {IconProps} from "solid-toast";
import {htmlAttributes} from "../utils";

export const WarningMark: VoidComponent<IconProps> = (props) => {
  return (
    <FaSolidCircleExclamation
      {...htmlAttributes.merge(props, {
        class: "inline-block mb-2 text-red-500",
        size: "12",
      })}
    />
  );
};
