import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {cx} from "components/utils";
import {TrackingMarker} from "components/utils/TrackingMarker";
import {FieldsetDisabledTracker} from "components/utils/fieldset_disabled_tracker";
import {For, JSX, Show, VoidComponent, createComputed, createMemo, createSignal, on} from "solid-js";
import {FieldBox} from "./FieldBox";
import {LabelOverride} from "./labels";

interface Props {
  readonly name: string;
  readonly label?: LabelOverride;
  readonly items: readonly Item[];
  /** Optionally value, if should be used in standalone mode (not in form). */
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly disabled?: boolean;
  /** Whether to make the control smaller. */
  readonly small?: boolean;
}

interface Item {
  readonly value: string;
  readonly label?: () => JSX.Element;
  readonly disabled?: boolean;
}

/**
 * A segmented control component, which is suitable for use both standalone and in a form.
 *
 * To use in a form, do not specify the value and setValue props. The component will connect to
 * the form using the native input elements.
 *
 * To use in standalone mode, specify the controlling signal via value and setValue.
 */
export const SegmentedControl: VoidComponent<Props> = (props) => (
  <FieldsetDisabledTracker>
    {(isFieldsetDisabled) => {
      const formContext = useFormContextIfInForm();
      const [value, setValue] = createSignal<string | undefined>(props.value ?? props.items[0]?.value);
      const isDisabled = () => isFieldsetDisabled() || props.disabled;
      createComputed(
        // eslint-disable-next-line solid/reactivity
        on(formContext ? () => formContext.form.data(props.name) as string : () => props.value, setValue),
      );
      createComputed(() => {
        if (value() !== undefined) {
          props.onValueChange?.(value()!);
        }
      });

      return (
        <FieldBox name={props.name} label={props.label} umbrella>
          <TrackingMarker
            activeId={value()}
            markerClass={({active}) =>
              cx(
                props.small ? "px-1" : "px-2 py-0.5",
                "border rounded",
                active
                  ? ["border-memo-active rounded", isDisabled() ? "bg-disabled" : "bg-select"]
                  : "border-transparent",
              )
            }
          >
            {(MarkerTarget) => (
              <div
                class={cx(
                  "border border-input-border rounded flex flex-wrap justify-between gap-1",
                  props.small ? "p-0.5 min-h-small-input" : "p-1 min-h-big-input",
                  isDisabled() ? "bg-disabled" : undefined,
                )}
              >
                <For each={props.items}>
                  {(item) => {
                    const isActive = createMemo(() => value() === item.value);
                    const isItemDisabled = () => isDisabled() || item.disabled;
                    return (
                      <label
                        class={cx(
                          "select-none text-black z-10",
                          isItemDisabled()
                            ? "text-opacity-50"
                            : ["cursor-pointer", isActive() ? undefined : "text-opacity-70"],
                        )}
                      >
                        <MarkerTarget id={item.value}>
                          <Show when={item.label} fallback={<>{item.value}</>}>
                            {(label) => label()()}
                          </Show>
                        </MarkerTarget>
                        <input
                          type="radio"
                          name={props.name}
                          value={item.value}
                          class="hidden"
                          disabled={isItemDisabled()}
                          checked={isActive()}
                          onInput={
                            formContext
                              ? undefined
                              : ({currentTarget}) => {
                                  if (currentTarget.checked) {
                                    setValue(item.value);
                                  }
                                }
                          }
                        />
                      </label>
                    );
                  }}
                </For>
              </div>
            )}
          </TrackingMarker>
        </FieldBox>
      );
    }}
  </FieldsetDisabledTracker>
);
