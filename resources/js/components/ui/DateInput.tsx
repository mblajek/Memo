import {cx} from "components/utils/classnames";
import {featureUseTrackers} from "components/utils/feature_use_trackers";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {DateTime} from "luxon";
import {Accessor, createSignal, onCleanup, Show, splitProps, VoidComponent} from "solid-js";
import {useFormContextIfInForm} from "../felte-form/FelteForm";
import {shortWeekdayName} from "../utils/date_formatting";
import {TextInput} from "./TextInput";

export interface DateInputProps extends htmlAttributes.input {
  readonly outerClass?: string;
  readonly showWeekday?: boolean;
}

export const DateInput: VoidComponent<DateInputProps> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["outerClass", "showWeekday"]);
  const t = useLangFunc();
  const featureKeyUpDown = featureUseTrackers.dateTimeInputKeyUpDown();
  const type = () => inputProps.type || "date";
  const showWeekday = () => props.showWeekday ?? type() === "date";
  const formContext = useFormContextIfInForm();
  const [getValue, setValue] = createSignal("");
  let value: Accessor<string>;
  if (formContext) {
    // eslint-disable-next-line solid/reactivity
    value = () => formContext.form.data(inputProps.name!);
  } else {
    value = getValue;
  }
  return (
    <div class={cx(props.outerClass, "grid")}>
      <TextInput
        ref={(input) => {
          if (!formContext) {
            setValue(input.value);
            // Use interval to detect programmatic changes, as well as the events.
            const id = setInterval(() => setValue(input.value), 200);
            onCleanup(() => clearInterval(id));
          }
        }}
        {...htmlAttributes.merge(inputProps, {
          class: cx("row-start-1 col-start-1 text-black", value() ? undefined : "text-opacity-50"),
          ...(formContext
            ? undefined
            : {
                onInput: ({currentTarget}) => setValue((currentTarget as HTMLInputElement).value),
                onChange: ({currentTarget}) => setValue((currentTarget as HTMLInputElement).value),
              }),
          onKeyDown: (e: KeyboardEvent) => {
            const target = e.currentTarget as HTMLInputElement;
            if (e.key === "Delete") {
              target.value = "";
              target.dispatchEvent(new InputEvent("input"));
              target.dispatchEvent(new Event("change"));
              formContext?.form.setData(inputProps.name!, "");
              e.preventDefault();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              featureKeyUpDown.justUsed({type: type()});
            }
          },
        })}
        type={type()}
        max={inputProps.max || "3000-12-31"}
      />
      <Show when={showWeekday() && value()}>
        <div class="row-start-1 col-start-1 flex items-center justify-end pr-8 pointer-events-none">
          {shortWeekdayName(t, DateTime.fromISO(value()))}
        </div>
      </Show>
    </div>
  );
};
