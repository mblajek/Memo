import {htmlAttributes} from "components/utils/html_attributes";
import {VoidComponent} from "solid-js";

export const TextInput: VoidComponent<htmlAttributes.input> = (props) => (
  <input
    type="text"
    {...htmlAttributes.merge(props, {
      class:
        "min-w-4 border border-input-border rounded invalid:border-red-400 aria-invalid:border-red-400 disabled:bg-disabled",
    })}
  />
);
