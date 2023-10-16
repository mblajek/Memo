import * as radio from "@zag-js/radio-group";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx, htmlAttributes} from "components/utils";
import {For, VoidComponent, createComputed, createMemo, createUniqueId, splitProps} from "solid-js";
import {FieldLabel} from ".";
import s from "./SegmentedControl.module.scss";

interface Props extends htmlAttributes.div {
  name: string;
  items: Item[];
  label?: string;
  /** Optionally value, if should be used in standalone mode (not in form). */
  value?: string;
  setValue?: (value: string) => void;
  disabled?: boolean;
  /** Whether to make the control smaller. */
  small?: boolean;
}

interface Item {
  readonly value: string;
  readonly text: string;
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
  const [_lProps, divProps] = splitProps(props, ["name", "label", "items", "value", "setValue", "disabled", "small"]);
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
        ...(props.disabled !== undefined ? {disabled: props.disabled} : undefined),
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
  return (
    <div>
      <FieldLabel fieldName={props.name} text={props.label} />
      <div
        {...htmlAttributes.merge(divProps, {
          class: cx(s.segmentedControl, {[s.small!]: props.small}),
        })}
        {...api().rootProps}
      >
        <div {...api().indicatorProps} />
        <For each={props.items}>
          {(item) => (
            <label {...api().getItemProps({value: item.value})}>
              <span {...api().getItemTextProps({value: item.value})}>{item.text}</span>
              <input {...api().getItemHiddenInputProps({value: item.value})} />
            </label>
          )}
        </For>
      </div>
    </div>
  );
};
