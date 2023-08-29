import {Component, JSX, createEffect, splitProps} from "solid-js";
import * as checkbox from "@zag-js/checkbox";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {createMemo, createUniqueId} from "solid-js";
import s from "./Checkbox.module.scss";
import {ValidationMessages} from "./ValidationMessages";
import {useFieldLabel} from "./FieldLabel";

export interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  name: string;
  label?: string;
  disabled?: boolean;
  onChange?: checkbox.Context["onChange"];
  indeterminate?: boolean;
}

/**
 * Wrapper of Zag's Checkbox
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const Checkbox: Component<CheckboxProps> = (props) => {
  const [machineProps, inputProps] = splitProps(props, ["onChange"]);

  const [state, send] = useMachine(
    checkbox.machine({
      id: createUniqueId(),
      onChange: (details) => machineProps.onChange?.(details),
    }),
    {
      context: {
        name: props.name,
      },
    },
  );

  const api = createMemo(() => checkbox.connect(state, send, normalizeProps));

  createEffect(() => {
    if (inputProps.checked === undefined) return;
    api().setChecked(inputProps.checked);
  });

  const data = useFieldLabel({fieldName: props.name, text: props.label});

  return (
    <div>
      <label {...api().rootProps} class={s.checkbox}>
        <div {...api().controlProps} />
        <span {...api().labelProps} class="inline-block" classList={{"first-letter:capitalize": data().capitalize}}>
          {data().text}
        </span>
        <input {...api().hiddenInputProps} {...inputProps} />
      </label>
      <ValidationMessages fieldName={props.name} />
    </div>
  );
};
