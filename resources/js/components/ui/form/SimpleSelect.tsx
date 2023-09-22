import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {cx} from "components/utils";
import {Component, For, JSX, splitProps} from "solid-js";
import {FieldLabel} from "./FieldLabel";

export interface SimpleSelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label?: string;
  options: Option[];
}

interface Option {
  value: string;
  text: string;
}

/**
 * Wrapper of native HTML's `<select>`. Supports options with string values and string representation.
 *
 * Intended for use with FelteForm (handles validation messages).
 */
export const SimpleSelect: Component<SimpleSelectProps> = (props) => {
  const [lProps, selectProps] = splitProps(props, ["label", "options"]);
  return (
    <div>
      <FieldLabel fieldName={selectProps.name} text={lProps.label} />
      <select
        id={selectProps.name}
        {...selectProps}
        class={cx("w-full border border-gray-400 rounded p-2 aria-invalid:border-red-400", props.class)}
      >
        <For each={lProps.options}>{(option) => <option value={option.value}>{option.text}</option>}</For>
      </select>
      <ValidationMessages fieldName={selectProps.name} />
    </div>
  );
};
