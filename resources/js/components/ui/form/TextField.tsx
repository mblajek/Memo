import {htmlAttributes} from "components/utils";
import {JSX, VoidComponent, splitProps} from "solid-js";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";
import {TextInput} from "../TextInput";

export interface TextFieldProps
  extends Pick<
    htmlAttributes.input,
    "type" | "autofocus" | "autocomplete" | "readonly" | "onClick" | "onInput" | "onChange"
  > {
  readonly name: string;
  readonly label?: JSX.Element;
}

/** Wrapper of native HTML's `<input>`. Intended for use with FelteForm (handles validation messages). */
export const TextField: VoidComponent<TextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label"]);
  return (
    <FieldBox {...props}>
      <TextInput
        id={props.name}
        name={props.name}
        autocomplete="off"
        {...htmlAttributes.merge(inputProps, {class: "min-h-big-input px-2"})}
        aria-labelledby={labelIdForField(props.name)}
      />
    </FieldBox>
  );
};
