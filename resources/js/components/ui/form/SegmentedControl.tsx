import * as radio from "@zag-js/radio-group";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {cx} from "components/utils";
import {For, JSX, Show, VoidComponent, createComputed, createMemo, createUniqueId, onMount} from "solid-js";
import {FieldBox} from "./FieldBox";
import s from "./SegmentedControl.module.scss";

interface Props {
  readonly name: string;
  readonly items: readonly Item[];
  readonly label?: JSX.Element;
  /** Optionally value, if should be used in standalone mode (not in form). */
  readonly value?: string;
  readonly setValue?: (value: string) => void;
  readonly disabled?: boolean;
  /** Whether to make the control smaller. */
  readonly small?: boolean;
}

interface Item {
  readonly value: string;
  readonly label?: () => JSX.Element;
}

/**
 * A segmented control component, which is suitable for use both standalone and in a form.
 *
 * To use in a form, do not specify the value and setValue props. The component will connect to
 * the form using the native input elements.
 *
 * To use in standalone mode, specify the controlling signal via value and setValue.
 */
export const SegmentedControl: VoidComponent<Props> = (props) => {
  const formContext = useFormContextIfInForm();
  const [state, send] = useMachine(
    radio.machine({
      // eslint-disable-next-line solid/reactivity
      name: props.name,
      // Initial value only.
      // eslint-disable-next-line solid/reactivity
      value: props.value ?? props.items[0]?.value,
      onValueChange: (change) => props.setValue?.(change.value),
      id: createUniqueId(),
    }),
    {
      context: () => ({
        disabled: props.disabled,
      }),
    },
  );
  const api = createMemo(() => radio.connect(state, send, normalizeProps));
  createComputed(() => {
    if (props.value !== undefined) {
      // Use the value from props only if really specified. Otherwise we are probably in the form mode.
      api().setValue(props.value);
    }
  });
  onMount(() => {
    if (props.value === undefined && formContext) {
      api().setValue(formContext.form.data(props.name));
    }
  });
  return (
    <FieldBox {...props} umbrella>
      <div {...api().rootProps} class={cx(s.segmentedControl, {[s.small!]: props.small})}>
        <div {...api().indicatorProps} />
        <For each={props.items}>
          {(item) => (
            <label {...api().getItemProps({value: item.value})}>
              <span {...api().getItemTextProps({value: item.value})}>
                <Show when={item.label} fallback={<>{item.value}</>}>
                  {(label) => label()()}
                </Show>
              </span>
              <input {...api().getItemHiddenInputProps({value: item.value})} />
            </label>
          )}
        </For>
      </div>
    </FieldBox>
  );
};
