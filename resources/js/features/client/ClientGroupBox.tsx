import {htmlAttributes} from "components/utils";
import {ParentComponent} from "solid-js";

export const CLIENT_GROUP_COLOR = "#e6b606";

export const ClientGroupBox: ParentComponent<htmlAttributes.div> = (props) => {
  return (
    <div
      {...htmlAttributes.merge(props, {
        class: "border-x-4 border-y p-1 rounded-lg",
        style: {"border-color": CLIENT_GROUP_COLOR},
      })}
    />
  );
};
