import {htmlAttributes} from "components/utils";
import {VoidComponent, splitProps} from "solid-js";
import {TextInput} from "../TextInput";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";
import {LabelOverride} from "./labels";

export interface TextFieldProps extends TextFieldTextFieldProps {
  readonly label?: LabelOverride;
  readonly small?: boolean;
}

/** Wrapper of native HTML's `<input>`. Intended for use with FelteForm (handles validation messages). */
export const TextField: VoidComponent<TextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label", "small"]);
  return (
    <FieldBox {...props}>
      <TextFieldTextInput name={props.name} small={props.small} {...inputProps} />
    </FieldBox>
  );
};

interface TextFieldTextFieldProps
  extends Pick<
    htmlAttributes.input,
    "type" | "min" | "max" | "step" | "autofocus" | "autocomplete" | "readonly" | "onClick" | "onInput" | "onChange"
  > {
  readonly name: string;
  readonly small?: boolean;
}

export const TextFieldTextInput: VoidComponent<TextFieldTextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "small"]);
  return (
    <TextInput
      id={props.name}
      name={props.name}
      autocomplete="off"
      {...htmlAttributes.merge(inputProps, {class: props.small ? "px-1 min-h-small-input" : "min-h-big-input px-2"})}
      aria-labelledby={labelIdForField(props.name)}
    />
  );
};
