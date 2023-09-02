import {cx} from "components/utils";
import {Component, JSX} from "solid-js";
import {FieldLabel} from "./FieldLabel";
import {ValidationMessages} from "./ValidationMessages";

interface Props extends JSX.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
}

/**
 * Wrapper of native HTML's `<input>` in the checkbox form.
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const Checkbox: Component<Props> = (props) => (
  <div>
    <FieldLabel
      fieldName={props.name}
      text={props.label}
      wrapIn={(text) => (
        <>
          <input
            type="checkbox"
            id={props.name}
            {...props}
            class={cx("border border-gray-400 rounded-sm p-2", "aria-invalid:border-red-400", props.class)}
          />{" "}
          {text}
        </>
      )}
    />
    <ValidationMessages fieldName={props.name} />
  </div>
);
