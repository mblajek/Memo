import {htmlAttributes} from "components/utils/html_attributes";
import {JSX, VoidComponent, splitProps} from "solid-js";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";

export interface RangeFieldProps
  extends Pick<htmlAttributes.input, "min" | "max" | "step" | "readonly" | "onInput" | "onChange"> {
  readonly name: string;
  readonly label?: JSX.Element;
}

/** Wrapper of native HTML's `<input>`. Intended for use with FelteForm (handles validation messages). */
export const RangeField: VoidComponent<RangeFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label"]);
  return (
    <FieldBox {...props}>
      <input
        id={props.name}
        name={props.name}
        type="range"
        {...htmlAttributes.merge(inputProps, {class: "h-6"})}
        aria-labelledby={labelIdForField(props.name)}
      />
    </FieldBox>
  );
};
