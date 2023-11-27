import {htmlAttributes} from "components/utils";
import {VoidComponent, splitProps} from "solid-js";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";

export interface TextFieldProps
  extends Pick<
    htmlAttributes.input,
    "type" | "autofocus" | "autocomplete" | "readonly" | "onClick" | "onInput" | "onChange"
  > {
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
    <FieldBox {...props}>
      <input
        id={props.name}
        name={props.name}
        autocomplete="off"
        {...htmlAttributes.merge(inputProps, {
          class:
            "min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled",
        })}
        aria-labelledby={labelIdForField(props.name)}
      />
    </FieldBox>
  );
};
