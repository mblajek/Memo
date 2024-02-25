import {htmlAttributes} from "components/utils";
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
}

/** Wrapper of native HTML's `<textarea>`. Intended for use with FelteForm (handles validation messages). */
export const MultilineTextField: VoidComponent<TextFieldProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["name", "label"]);
  return (
    <FieldBox {...props}>
      <textarea
        id={props.name}
        name={props.name}
        {...TRIM_ON_BLUR}
        {...htmlAttributes.merge(inputProps, {
          class:
            "h-24 min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled",
        })}
        aria-labelledby={labelIdForField(props.name)}
      />
    </FieldBox>
  );
};
