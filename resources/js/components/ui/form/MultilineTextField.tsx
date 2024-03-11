import {cx, htmlAttributes} from "components/utils";
import {VoidComponent, splitProps} from "solid-js";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";
import {LabelOverride} from "./labels";
import {TRIM_ON_BLUR} from "./util";

export interface TextFieldProps
  extends Pick<
    htmlAttributes.textarea,
    "autofocus" | "autocomplete" | "readonly" | "onClick" | "onInput" | "onChange"
  > {
  readonly name: string;
  readonly label?: LabelOverride;
  readonly small?: boolean;
}

/** Wrapper of native HTML's `<textarea>`. Intended for use with FelteForm (handles validation messages). */
export const MultilineTextField: VoidComponent<TextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label", "small"]);
  return (
    <FieldBox {...props}>
      <textarea
        id={props.name}
        name={props.name}
        {...TRIM_ON_BLUR}
        {...htmlAttributes.merge(inputProps, {
          class: cx(
            "border border-input-border rounded aria-invalid:border-red-400 disabled:bg-disabled",
            props.small ? "h-12 min-h-small-input px-1" : "h-24 min-h-big-input px-2",
          ),
        })}
        aria-labelledby={labelIdForField(props.name)}
      />
    </FieldBox>
  );
};
