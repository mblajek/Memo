import {htmlAttributes} from "components/utils/html_attributes";
import {VoidComponent, splitProps} from "solid-js";
import {DateInput, DateInputProps} from "../DateInput";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";
import {LabelOverride} from "./labels";
import {TRIM_ON_BLUR} from "./util";

export interface DateFieldProps extends DateFieldDateInputProps {
  readonly label?: LabelOverride;
  readonly small?: boolean;
}

/** Wrapper of native HTML's `<input>`. Intended for use with FelteForm (handles validation messages). */
export const DateField: VoidComponent<DateFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label", "small"]);
  return (
    <FieldBox {...props}>
      <DateFieldDateInput name={props.name} small={props.small} {...TRIM_ON_BLUR} {...inputProps} />
    </FieldBox>
  );
};

interface DateFieldDateInputProps
  extends Pick<
    DateInputProps,
    | "outerClass"
    | "showWeekday"
    | "class"
    | "type"
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

export const DateFieldDateInput: VoidComponent<DateFieldDateInputProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "small"]);
  return (
    <DateInput
      id={props.name}
      name={props.name}
      autocomplete="off"
      {...htmlAttributes.merge(inputProps, {class: props.small ? "px-1 min-h-small-input" : "min-h-big-input px-2"})}
      aria-labelledby={labelIdForField(props.name)}
    />
  );
};
