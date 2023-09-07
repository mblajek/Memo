import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {cx} from "components/utils";
import {Component, JSX} from "solid-js";
import {FieldLabel} from "./FieldLabel";

export interface TextFieldProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
}

/**
 * Wrapper of native HTML's `<input>`
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const TextField: Component<TextFieldProps> = (props) => {
  return (
    <div>
      <FieldLabel fieldName={props.name} text={props.label} />
      <input
        id={props.name}
        {...props}
        class={cx("w-full border border-gray-400 rounded p-2", "aria-invalid:border-red-400", props.class)}
      />
      <ValidationMessages fieldName={props.name} />
    </div>
  );
};
