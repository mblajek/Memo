import {VoidComponent} from "solid-js";
import {htmlAttributes} from "../utils";

export const TextInput: VoidComponent<htmlAttributes.input> = (props) => (
  <input
    type="text"
    {...htmlAttributes.merge(props, {
      class:
        "min-w-4 border border-input-border rounded invalid:border-red-400 invalid:outline-red-400 aria-invalid:border-red-400 aria-invalid:outline-red-400 disabled:bg-disabled",
    })}
  />
);
