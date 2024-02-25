import {htmlAttributes} from "components/utils";
import {VoidComponent, splitProps} from "solid-js";
import {TextInput} from "../TextInput";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";
import {LabelOverride} from "./labels";

export interface TextFieldProps
  extends Pick<
    htmlAttributes.input,
    "type" | "min" | "max" | "step" | "autofocus" | "autocomplete" | "readonly" | "onClick" | "onInput" | "onChange"
  > {
  readonly name: string;
  readonly label?: LabelOverride;
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
