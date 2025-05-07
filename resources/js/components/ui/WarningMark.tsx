import {VoidComponent} from "solid-js";

import {htmlAttributes} from "components/utils/html_attributes";
import {IconProps} from "solid-icons";
import {FaSolidCircleExclamation} from "solid-icons/fa";

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
