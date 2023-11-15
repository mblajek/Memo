import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {htmlAttributes} from "components/utils";
import {VoidComponent, splitProps} from "solid-js";
import {FieldLabel, labelIdForField} from "./FieldLabel";

export interface TextFieldProps extends htmlAttributes.input {
  readonly name: string;
  readonly label?: string;
}

/**
 * Wrapper of native HTML's `<input>`
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const TextField: VoidComponent<TextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label"]);
  return (
    <div>
      <FieldLabel fieldName={props.name} text={props.label} />
      <input
        id={props.name}
        name={props.name}
        {...htmlAttributes.merge(inputProps, {
          class:
            "w-full min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled",
        })}
        aria-labelledby={labelIdForField(props.name)}
      />
      <ValidationMessages fieldName={props.name} />
    </div>
  );
};
