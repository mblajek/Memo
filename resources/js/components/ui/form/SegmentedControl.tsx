import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {cx} from "components/utils";
import {TrackingMarker} from "components/utils/TrackingMarker";
import {FieldsetDisabledTracker} from "components/utils/fieldset_disabled_tracker";
import {hasProp} from "components/utils/props";
import {For, JSX, Show, VoidComponent, createComputed, createSignal} from "solid-js";
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
      const [value, setValue] = createSignal<string>();
      const isDisabled = () => isFieldsetDisabled() || props.disabled;
      const inputValue = () =>
        hasProp(props, "value") ? props.value : formContext ? (formContext.form.data(props.name) as string) : undefined;
      createComputed(() => setValue(inputValue() ?? props.items[0]?.value));
      createComputed(() => {
        if (value() !== undefined) {
          props.onValueChange?.(value()!);
        }
      });
      const isFormMode = formContext && !hasProp(props, "value");

      return (
        <FieldBox name={props.name} label={props.label} umbrella>
          <TrackingMarker
            activeId={value()}
            markerClass={({active}) =>
              cx(
                props.small ? "px-1" : "px-2 py-0.5",
                "border rounded",
                active ? "border-memo-active bg-select" : "border-transparent",
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
                <For each={props.items.map(({value}) => value)}>
                  {(itemValue, index) => {
                    const item = () => props.items[index()]!;
                    const isActive = () => value() === itemValue;
                    const isItemDisabled = () => isDisabled() || item().disabled;
                    function activate() {
                      if (!isItemDisabled()) {
                        setValue(itemValue);
                      }
                    }
                    let input: HTMLInputElement | undefined;
                    return (
                      <label
                        class={cx(
                          "select-none text-black z-10",
                          isItemDisabled()
                            ? "text-opacity-50"
                            : ["cursor-pointer", isActive() ? undefined : "text-opacity-80"],
                        )}
                        tabIndex="0"
                        onClick={isFormMode ? undefined : activate}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isFormMode) {
                              input?.click();
                            } else {
                              activate();
                            }
                          }
                        }}
                      >
                        <MarkerTarget id={itemValue}>
                          <Show when={item().label} fallback={<>{itemValue}</>}>
                            {(label) => <>{label()()}</>}
                          </Show>
                        </MarkerTarget>
                        <Show when={isFormMode}>
                          <input
                            ref={input}
                            type="radio"
                            name={props.name}
                            value={itemValue}
                            class="hidden"
                            checked={isActive()}
                            disabled={isItemDisabled()}
                            onClick={activate}
                          />
                        </Show>
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
