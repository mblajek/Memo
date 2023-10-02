import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {htmlAttributes} from "components/utils";
import {VoidComponent} from "solid-js";
import {FieldLabel, labelIdForField} from "./FieldLabel";
import {splitProps} from "solid-js";

export interface TextFieldProps extends htmlAttributes.input {
  name: string;
  label?: string;
}

/**
 * Wrapper of native HTML's `<input>`
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const TextField: VoidComponent<TextFieldProps> = (props) => {
  const [_lProps, inputProps] = splitProps(props, ["name", "label"]);
  return (
    <div>
      <FieldLabel fieldName={props.name} text={props.label} />
      <input
        id={props.name}
        name={props.name}
        {...htmlAttributes.merge(inputProps, {
          class: "w-full border border-gray-400 rounded p-2 aria-invalid:border-red-400",
        })}
        aria-labelledby={labelIdForField(props.name)}
      />
      <ValidationMessages fieldName={props.name} />
    </div>
  );
};
