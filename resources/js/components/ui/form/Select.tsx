import {Collection} from "@zag-js/collection";
import * as combobox from "@zag-js/combobox";
import {PropTypes, normalizeProps, useMachine} from "@zag-js/solid";
import {cx, htmlAttributes, useLangFunc} from "components/utils";
import {AiFillCaretDown} from "solid-icons/ai";
import {FiDelete} from "solid-icons/fi";
import {ImCross, ImSpinner2} from "solid-icons/im";
import {RiSystemDeleteBin6Line} from "solid-icons/ri";
import {
  Accessor,
  For,
  JSX,
  Match,
  Show,
  Switch,
  VoidComponent,
  VoidProps,
  createComputed,
  createEffect,
  createMemo,
  createUniqueId,
  mergeProps,
  splitProps,
} from "solid-js";
import {Portal} from "solid-js/web";
import {Button} from "../Button";
import {FieldLabel} from "./FieldLabel";
import s from "./Select.module.scss";
import {on} from "solid-js";

export interface SelectBaseProps extends VoidProps<htmlAttributes.div> {
  name: string;
  label?: string;
  /**
   * The items to show in this select. In the external filtering mode, the list should change
   * when the filter changes. In the internal filtering mode, the list should not change, and will
   * be filtered internally.
   */
  items: SelectItem[];
  /**
   * Filtering:
   * - If missing, filtering is disabled (the default).
   * - If `"internal"`, the component will filter the items internally by the `text` property of the items.
   * - If a function, the function is called when the filter text changes, which typically results in the parent
   *   supplying a new list of items.
   */
  onFilterChange?: "internal" | ((filterText: string | undefined) => void);
  /** Whether the items are still loading. */
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Whether the control should be shown in the small version. */
  small?: boolean;
}

export interface SingleSelectPropsPart {
  multiple?: false;
  value?: string | undefined;
  onValueChange?: (value: string | undefined) => void;
  /**
   * Whether the value can be cleared from within the select control.
   * Even with nullable set to false, it is possible to have no value, but it is not possible
   * to set this value from within the select control.
   */
  nullable: boolean;
}

export interface MultipleSelectPropsPart {
  multiple: true;
  value?: string[];
  onValueChange?: (value: string[]) => void;
  /** Whether to show the button to clear all of the selected values. Defaults to true. */
  showClearButton?: boolean;
}

export type SingleSelectProps = SelectBaseProps & SingleSelectPropsPart;
export type MultipleSelectProps = SelectBaseProps & MultipleSelectPropsPart;
export type SelectProps = SingleSelectProps | MultipleSelectProps;

export interface SelectItem {
  /** The internal value of the item. Must be unique among the items. Must not be empty. */
  value: string;
  /**
   * The optional text, used only for internal filtering of the items (when onFilterChange is not specified).
   * If missing in the internal filtering mode, the items are filtered by the value string.
   */
  text?: string;
  /** The item, as displayed in the component when selected. If not specified, the text (or the value) is used. */
  label?: () => JSX.Element;
  /** The item, as displayed on the expanded list. If not specified, label is used. */
  labelOnList?: () => JSX.Element;
  disabled?: boolean;
}

function itemToString(item: SelectItem) {
  return item.text || item.value;
}
function itemToLabel(item: SelectItem) {
  return item.label ? item.label() : <>{itemToString(item)}</>;
}
function itemToLabelOnList(item: SelectItem) {
  return item.labelOnList ? item.labelOnList() : itemToLabel(item);
}

const DEFAULT_PROPS = {
  isLoading: false,
  small: false,
  nullable: false,
  showClearButton: true,
};

/**
 * A select-like component for selecting a single item from a list of items.
 * Supports searching using keyboard (the parent should provide the filtered list of items).
 *
 * TODO: Add support for placing the component in a form. Right now there is a hidden input with
 * the selected value, but the component does not receive the value from the form controller.
 *
 * WARNING: The implementation has many workarounds and specific solutions, and the zag component
 * it's based on is still in development and has bugs. It might also change in an incompatible way
 * even between minor versions while it's still on the major version 0. Be very careful when updating
 * the zag library.
 */
export const Select: VoidComponent<SelectProps> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, divProps] = splitProps(defProps, [
    "name",
    "label",
    "items",
    "nullable",
    "multiple",
    "value",
    "onValueChange",
    "onFilterChange",
    "showClearButton",
    "disabled",
    "isLoading",
    "placeholder",
    "small",
  ]);
  const t = useLangFunc();

  // Temporarily assign an empty collection, and overwrite with the actual collection depending on
  // the filtered items later. It's done like this because filtering needs api() which is not created yet.
  let collection: Accessor<Collection<SelectItem>> = () => combobox.collection.empty();

  const [state, send] = useMachine(
    combobox.machine({
      id: createUniqueId(),
      // eslint-disable-next-line solid/reactivity
      name: props.name,
      // Needed but never used, the actual collection comes from the context below.
      collection: combobox.collection.empty(),
      positioning: {
        offset: {mainAxis: 0},
        strategy: "absolute",
        placement: "bottom-end",
        overflowPadding: 20,
        flip: true,
        sameWidth: false,
      },
      onInputValueChange: ({value}) => {
        if (typeof props.onFilterChange === "function") {
          props.onFilterChange(value);
        }
      },
      onValueChange: ({value}) => {
        if (props.onValueChange) {
          if (props.multiple) {
            (props as MultipleSelectPropsPart).onValueChange!(value);
          } else {
            (props as SingleSelectPropsPart).onValueChange!(value[0]);
          }
        } else {
          api().setValue(value);
        }
        // Clear the filtering, in case the user wants to select another item later.
        if (typeof props.onFilterChange === "function") {
          props.onFilterChange?.(undefined);
        }
      },
      // Keep the input empty when the value is selected. The selected value is displayed outside of
      // the input.
      selectionBehavior: "clear",
      // We want the open on click behavior, but we need a custom implementation because we want to
      // react not only on clicking the input. In particular, in the no filtering mode there is no input.
      openOnClick: false,
      // This option seems to be equivalent to `broken: false`, as selecting on blur breaks many things,
      // especially in the multiple mode.
      selectOnBlur: false,
      loop: false,
      // We want to clear the input when the user clicks outside of the component. This is the default, but
      // there seems to be a bug - clicking the buttons inside of the select are also treated as clicking
      // outside of the component. So instead set allowCustomValue and clear the input conditionally.
      // This is a workaround.
      allowCustomValue: true,
      onInteractOutside: (e) => {
        const {target} = e.detail.originalEvent;
        const isReallyInside = target instanceof Node && (root?.contains(target) || portalRoot?.contains(target));
        if (!isReallyInside) {
          api().setInputValue("");
        }
      },
    }),
    {
      context: () => ({
        collection: collection(),
        multiple: props.multiple,
        disabled: props.disabled,
      }),
    },
  );
  const api = createMemo(() => combobox.connect<PropTypes, SelectItem>(state, send, normalizeProps));
  createComputed(
    on(
      () => props.value,
      (propsValue) =>
        api().setValue(Array.isArray(propsValue) ? propsValue : propsValue === undefined ? [] : [propsValue]),
    ),
  );

  const isInternalFilteringMode = () => props.onFilterChange === "internal";
  // Wrap the input value in a memo to avoid an infinite loop of updates, where updating the filter changes the items,
  // which updates the collection, and in consequence the api object, which unnecessarily triggers the filtering again.
  const filterValue = createMemo(() => api().inputValue.toLocaleLowerCase());
  /** The items after filtering, regardless of the filtering mode. */
  const filteredItems = createMemo(() => {
    if (isInternalFilteringMode()) {
      const filter = filterValue();
      if (!filter) {
        return props.items;
      }
      return props.items.filter((item) => itemToString(item).toLocaleLowerCase().includes(filter));
    }
    return props.items;
  });
  const itemsToShow = createMemo((): SelectItem[] => {
    const filtered = filteredItems();
    if (filtered.length) {
      return filtered;
    }
    if (props.isLoading) {
      return [
        {
          value: " _loading",
          label: () => (
            <div class="w-full flex justify-center">
              <ImSpinner2 class="m-1 w-4 h-4 animate-spin" />
            </div>
          ),
          disabled: true,
        },
      ];
    }
    return [
      {
        value: " _noItems",
        label: () => <>{t(api().isInputValueEmpty ? "select.no_items" : "select.no_matching_items")}</>,
        disabled: true,
      },
    ];
  });
  const collectionMemo = createMemo(() =>
    combobox.collection<SelectItem>({
      items: itemsToShow(),
      itemToValue: (item) => item.value,
      // All the items present themselves as empty string because there is at least one bug
      // in the zag component that causes the string representation of the selected item to
      // appear in the input field. This is a workaround.
      itemToString: () => "",
      isItemDisabled: (item) => !!item.disabled,
    }),
  );
  collection = collectionMemo;

  /**
   * A map for storing all the encountered items. This is needed to show the selected item(s) when
   * a filter is present, because otherwise the items don't exist, and api().selectedItems doesn't
   * return them, even though api().value has the corresponding entries.
   */
  const itemsMap = new Map<string, SelectItem>();
  createEffect(() => {
    for (const item of filteredItems()) {
      itemsMap.set(item.value, item);
    }
  });
  /**
   * Returns the label for the specified value. If the value is unknown (not present in itemsMap),
   * the value is removed from the selected values in api(), and undefined is returned.
   */
  function getValueLabel(value: string) {
    const item = itemsMap.get(value);
    if (item) {
      return itemToLabel(item);
    }
    api().clearValue(value);
    return undefined;
  }

  // Sometimes api().inputValue is correctly empty, but the input still contains some text, which is probably
  // a bug in the zag component. This is a workaround.
  let input: HTMLInputElement | undefined;
  createEffect(() => {
    if (input) {
      input.value = api().inputValue;
    }
  });

  let root: HTMLDivElement | undefined;
  let portalRoot: HTMLDivElement | undefined;

  /** Whether the component is disabled, either directly or via a fieldset. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDisabled = () => (api().controlProps as any)["data-disabled"] !== undefined;

  return (
    <>
      <div
        ref={root}
        {...api().rootProps}
        {...htmlAttributes.merge(divProps, {
          class: cx(s.select, {
            [s.single!]: !props.multiple,
            [s.multiple!]: props.multiple,
            [s.small!]: props.small,
          }),
        })}
        inert={isDisabled() ? true : undefined}
      >
        <FieldLabel
          fieldName={props.name}
          text={props.label}
          {...(api().labelProps as Omit<htmlAttributes.label, "children">)}
        />
        {/* An input that can be consumed by the form controller.
        It cannot be set by the form controller though (yet). */}
        <input class="hidden" name={props.name} value={api().value.join(",")} />
        <div {...api().controlProps} onClick={() => api().open()}>
          <Switch>
            <Match when={props.multiple}>
              <For each={api().value}>
                {(value) => {
                  return (
                    <div class={s.value}>
                      <div class={s.label}>{getValueLabel(value)}</div>
                      <Button
                        class={s.delete}
                        onClick={(e) => {
                          // Avoid opening the select.
                          e.stopPropagation();
                          api().clearValue(value);
                        }}
                      >
                        <ImCross size="8" />
                      </Button>
                    </div>
                  );
                }}
              </For>
            </Match>
            <Match when={!props.multiple}>
              {/* The current value is displayed inside the input element, so only display it
              when the input is empty (like a placeholder). */}
              <Show when={api().isInputValueEmpty && api().value[0]}>
                {(value) => <div class={s.value}>{getValueLabel(value())}</div>}
              </Show>
            </Match>
          </Switch>
          <input
            ref={input}
            {...api().inputProps}
            // This is just for user entry, and not the actual form value.
            name=""
            placeholder={api().value.length ? undefined : props.placeholder}
            // Without filtering, the input is used just for the placeholder.
            inert={props.onFilterChange ? undefined : true}
          />
          <div class={s.buttons}>
            {/* Display only one clear button at a time. */}
            <Switch>
              <Match when={!api().isInputValueEmpty}>
                <Button
                  data-scope="combobox"
                  class={cx(s.clearButton)}
                  onClick={() => {
                    api().setInputValue("");
                    api().focus();
                  }}
                  title={t("actions.clear")}
                >
                  <FiDelete />
                </Button>
              </Match>
              <Match when={!props.multiple && props.nullable && api().value.length}>
                <Button
                  class={cx(s.clearButton)}
                  onClick={(e) => {
                    // Avoid opening the
                    e.stopPropagation();
                    api().clearValue();
                  }}
                  title={t("actions.clear")}
                >
                  <FiDelete />
                </Button>
              </Match>
              <Match when={props.multiple && props.showClearButton && api().value.length}>
                <Button
                  class={cx(s.clearButton)}
                  onClick={(e) => {
                    // Avoid opening the
                    e.stopPropagation();
                    api().clearValue();
                  }}
                  title={t("actions.clear")}
                >
                  {/* Use a bin icon for multiple select because it looks more destructive, which is appropriate. */}
                  <RiSystemDeleteBin6Line />
                </Button>
              </Match>
            </Switch>
            <Button
              // Don't use api().triggerProps because it sorts the selection in multiple mode, which is not desired.
              // The control will handle clicks.
              title={t("actions.expand")}
            >
              <AiFillCaretDown />
            </Button>
          </div>
        </div>
      </div>
      <Portal>
        <div
          ref={portalRoot}
          {...api().positionerProps}
          class={cx(s.selectPortal, {
            [s.small!]: props.small,
            [s.loading!]: props.isLoading,
          })}
        >
          <ul {...api().contentProps}>
            <For each={itemsToShow()}>
              {(item) => <li {...api().getItemProps({item})}>{itemToLabelOnList(item)}</li>}
            </For>
          </ul>
        </div>
      </Portal>
    </>
  );
};
