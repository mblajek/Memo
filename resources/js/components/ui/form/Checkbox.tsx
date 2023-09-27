import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {htmlAttributes} from "components/utils";
import {VoidComponent} from "solid-js";
import {FieldLabel} from "./FieldLabel";

interface Props extends htmlAttributes.input {
  name: string;
  label?: string;
}

/**
 * Wrapper of native HTML's `<input>` in the checkbox form.
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const Checkbox: VoidComponent<Props> = (props) => (
  <div>
    <FieldLabel
      fieldName={props.name}
      text={props.label}
      class="ml-1"
      title={props.title}
      wrapIn={(text) => (
        <>
          <input
            type="checkbox"
            id={props.name}
            {...htmlAttributes.merge(props, {
              class: "border border-gray-400 p-2 aria-invalid:border-red-400",
            })}
          />{" "}
          {text}
        </>
      )}
    />
    <ValidationMessages fieldName={props.name} />
  </div>
);
