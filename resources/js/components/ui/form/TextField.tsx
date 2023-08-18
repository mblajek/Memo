import {useFormContext} from "components/felte-form";
import {cx} from "components/utils";
import {Component, JSX} from "solid-js";
import {ValidationMessages} from "./ValidationMessages";

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
  const {
    translations: {getFieldName},
  } = useFormContext();
  return (
    <div>
      <label for={props.name} class="inline-block first-letter:capitalize">
        {props.label || getFieldName(props.name)}
      </label>
      <input
        {...props}
        class={cx("w-full border border-gray-400 rounded-sm p-2", "aria-invalid:border-red-400", props.class)}
      />
      <ValidationMessages fieldName={props.name} />
    </div>
  );
};
