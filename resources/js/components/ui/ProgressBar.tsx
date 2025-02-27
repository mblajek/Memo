import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {VoidComponent} from "solid-js";

export const ProgressBar: VoidComponent<htmlAttributes.progress> = (props) => (
  <div class="border border-input-border rounded flex flex-col overflow-clip">
    <progress {...htmlAttributes.merge(props, {class: cx("w-full h-2", props.max && "animate-pulse")})} />
  </div>
);
