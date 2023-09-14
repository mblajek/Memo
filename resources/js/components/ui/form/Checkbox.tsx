import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {cx} from "components/utils";
import {Component, JSX} from "solid-js";
import {FieldLabel} from "./FieldLabel";

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
      class="ml-1"
      title={props.title}
      wrapIn={(text) => (
        <>
          <input
            type="checkbox"
            id={props.name}
            {...props}
            class={cx("border border-gray-400 p-2", "aria-invalid:border-red-400", props.class)}
          />{" "}
          {text}
        </>
      )}
    />
    <ValidationMessages fieldName={props.name} />
  </div>
);
