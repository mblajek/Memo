import {featureUseTrackers} from "components/utils/feature_use_trackers";
import {DateTime} from "luxon";
import {createSignal, onCleanup, Show, splitProps, VoidComponent} from "solid-js";
import {useFormContextIfInForm} from "../felte-form/FelteForm";
import {cx, htmlAttributes, useLangFunc} from "../utils";
import {shortWeekdayName} from "../utils/date_formatting";
import {TextInput} from "./TextInput";

interface Props extends htmlAttributes.input {
  readonly outerClass?: string;
  readonly showWeekday?: boolean;
}

export const DateInput: VoidComponent<Props> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["outerClass", "showWeekday"]);
  const t = useLangFunc();
  const featureKeyUpDown = featureUseTrackers.dateTimeInputKeyUpDown();
  const type = () => inputProps.type || "date";
  const showWeekday = () => props.showWeekday ?? type() === "date";
  const formContext = useFormContextIfInForm();
  const [getValue, setValue] = createSignal("");
  let value;
  if (formContext) {
    // eslint-disable-next-line solid/reactivity
    value = () => formContext.form.data(inputProps.name!) as string;
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
            if (e.key === "Delete") {
              (e.currentTarget as HTMLInputElement).value = "";
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
