import {VoidComponent} from "solid-js";
import {htmlAttributes} from "../utils";

export const TextInput: VoidComponent<htmlAttributes.input> = (props) => (
  <input
    type="text"
    {...htmlAttributes.merge(props, {
      class: "border border-input-border rounded aria-invalid:border-red-400 disabled:bg-disabled",
    })}
  />
);
