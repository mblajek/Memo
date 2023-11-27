import {htmlAttributes} from "components/utils";
import {For, VoidComponent, splitProps} from "solid-js";
import {FieldBox} from "./FieldBox";
import {labelIdForField} from "./FieldLabel";

export interface SimpleSelectProps extends htmlAttributes.select {
  readonly name: string;
  readonly label?: string;
  readonly options: readonly Option[];
}

interface Option {
  readonly value: string;
  readonly text: string;
}

/**
 * Wrapper of native HTML's `<select>`. Supports options with string values and string representation.
 *
 * Intended for use with FelteForm (handles validation messages).
 */
export const SimpleSelect: VoidComponent<SimpleSelectProps> = (allProps) => {
  const [props, selectProps] = splitProps(allProps, ["name", "label", "options"]);
  return (
    <FieldBox {...props}>
      <select
        id={props.name}
        name={props.name}
        {...htmlAttributes.merge(selectProps, {
          class: "w-full border border-input-border rounded p-2 aria-invalid:border-red-400",
        })}
        aria-labelledby={labelIdForField(props.name)}
      >
        <For each={props.options}>{(option) => <option value={option.value}>{option.text}</option>}</For>
      </select>
    </FieldBox>
  );
};
