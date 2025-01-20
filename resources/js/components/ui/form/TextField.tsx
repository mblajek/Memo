import {htmlAttributes} from "components/utils/html_attributes";
import {VoidComponent, splitProps} from "solid-js";
import {TextInput} from "../TextInput";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";
import {LabelOverride} from "./labels";
import {TRIM_ON_BLUR} from "./util";

export interface TextFieldProps extends TextFieldTextInputProps {
  readonly label?: LabelOverride;
  readonly small?: boolean;
}

/** Wrapper of native HTML's `<input>`. Intended for use with FelteForm (handles validation messages). */
export const TextField: VoidComponent<TextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label", "small"]);
  return (
    <FieldBox {...props}>
      <TextFieldTextInput name={props.name} small={props.small} {...TRIM_ON_BLUR} {...inputProps} />
    </FieldBox>
  );
};

interface TextFieldTextInputProps
  extends Pick<
    htmlAttributes.input,
    | "class"
    | "type"
    | "required"
    | "min"
    | "max"
    | "step"
    | "autofocus"
    | "autocomplete"
    | "autocapitalize"
    | "autocorrect"
    | "spellcheck"
    | "readonly"
    | "disabled"
    | "placeholder"
    | "onClick"
    | "onInput"
    | "onChange"
  > {
  readonly name: string;
  readonly small?: boolean;
}

export const TextFieldTextInput: VoidComponent<TextFieldTextInputProps> = (allProps) => {
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
