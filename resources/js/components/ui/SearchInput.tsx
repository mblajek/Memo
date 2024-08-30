import {FiDelete} from "solid-icons/fi";
import {Show, VoidComponent, createEffect, createSignal, on, splitProps} from "solid-js";
import {cx, htmlAttributes, useLangFunc} from "../utils";
import {Button} from "./Button";
import {TextInput} from "./TextInput";

interface Props extends htmlAttributes.input {
  readonly divClass?: string;
  readonly onValueChange?: (value: string) => void;
}

export const SearchInput: VoidComponent<Props> = (allProps) => {
  const [props, inputProps] = splitProps(allProps, ["divClass", "onValueChange"]);
  const t = useLangFunc();
  let ref: HTMLInputElement | undefined;
  const [value, setValue] = createSignal("");
  function setNow() {
    const val = ref?.value || "";
    props.onValueChange?.(val);
    setValue(val);
  }
  createEffect(
    on(
      () => inputProps.value,
      () => setTimeout(setNow),
    ),
  );
  return (
    <div class={cx(props.divClass, "flex items-stretch relative")}>
      <TextInput
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck={false}
        {...htmlAttributes.merge(inputProps, {
          class: "grow !pr-6",
          onInput: setNow,
          onChange: setNow,
        })}
        ref={(input) => {
          ref = input;
          (inputProps.ref as (elem: HTMLInputElement) => void)?.(input);
        }}
      />
      <Show when={value()}>
        <Button
          class="absolute right-0 top-0 bottom-0 px-2"
          onClick={() => {
            if (ref) {
              ref.value = "";
              ref.dispatchEvent(new InputEvent("input"));
              ref.focus();
            }
          }}
          title={t("actions.clear")}
        >
          <FiDelete />
        </Button>
      </Show>
    </div>
  );
};
