import {ValidationMessages} from "components/felte-form/ValidationMessages";
import {htmlAttributes} from "components/utils";
import {For, VoidComponent, splitProps} from "solid-js";
import {FieldLabel} from "./FieldLabel";

export interface SimpleSelectProps extends htmlAttributes.select {
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
export const SimpleSelect: VoidComponent<SimpleSelectProps> = (props) => {
  const [lProps, selectProps] = splitProps(props, ["label", "options"]);
  return (
    <div>
      <FieldLabel fieldName={selectProps.name} text={lProps.label} />
      <select
        id={selectProps.name}
        {...htmlAttributes.merge(selectProps, {
          class: "w-full border border-gray-400 rounded p-2 aria-invalid:border-red-400",
        })}
      >
        <For each={lProps.options}>{(option) => <option value={option.value}>{option.text}</option>}</For>
      </select>
      <ValidationMessages fieldName={selectProps.name} />
    </div>
  );
};
