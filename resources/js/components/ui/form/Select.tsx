import {Collection} from "@zag-js/collection";
import * as combobox from "@zag-js/combobox";
import {PropTypes, normalizeProps, useMachine} from "@zag-js/solid";
import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {isValidationMessageEmpty} from "components/felte-form/ValidationMessages";
import {cx, useLangFunc} from "components/utils";
import {useIsFieldsetDisabled} from "components/utils/fieldset_disabled_tracker";
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
  batch,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  on,
} from "solid-js";
import {Portal} from "solid-js/web";
import {Button} from "../Button";
import {SmallSpinner} from "../Spinner";
import {FieldBox} from "./FieldBox";
import {PlaceholderField} from "./PlaceholderField";
import s from "./Select.module.scss";
import {LabelOverride} from "./labels";

export interface SelectBaseProps {
  readonly name: string;
  readonly label?: LabelOverride;
  /**
   * The items to show in this select. In the external filtering mode, the list should change
   * when the filter changes. In the internal filtering mode, the list should not change, and will
   * be filtered internally.
   */
  readonly items: readonly SelectItem[];
  /**
   * Function called when the current value is unknown, i.e. there was never an item with this value in items, so
   * the component doesn't know how to display it.
   *
   * The return value specifies the missing items, if available. Once the accessor returns data, any items that
   * are still unknown, are considered invalid and are removed from the select.
   *
   * Every time this function is called, the accessors returned from any previous invocations are no longer needed, so
   * the parent can actually return the same accessor every time, just with content updated based on the most recent
   * missing values. In a typical usage, there will be at most one call to this function.
   */
  readonly getReplacementItems?: (missingValues: readonly string[]) => Accessor<ReplacementItems>;
  /**
   * Filtering:
   * - If missing, filtering is disabled (the default).
   * - If `"internal"`, the component will filter the items internally by the `text` property of the items.
   * - If a function, the function is called when the filter text changes, which typically results in the parent
   *   supplying a new list of items.
   */
  readonly onFilterChange?: "internal" | ((filterText: string | undefined) => void);
  /** Whether the items are still loading. */
  readonly isLoading?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  /** Whether the control should be shown in the small version. */
  readonly small?: boolean;
}

export interface SingleSelectPropsPart {
  readonly multiple?: false;
  readonly value?: string | undefined;
  readonly onValueChange?: (value: string | undefined) => void;
  /**
   * Whether the value can be cleared from within the select control.
   * Even with nullable set to false, it is possible to have no value, but it is not possible
   * to set this value from within the select control.
   */
  readonly nullable: boolean;
}

export interface MultipleSelectPropsPart {
  readonly multiple: true;
  readonly value?: readonly string[];
  readonly onValueChange?: (value: readonly string[]) => void;
  /** Whether to show the button to clear all of the selected values. Defaults to true. */
  readonly showClearButton?: boolean;
}

export type SingleSelectProps = SelectBaseProps & SingleSelectPropsPart;
export type MultipleSelectProps = SelectBaseProps & MultipleSelectPropsPart;
export type SelectProps = SingleSelectProps | MultipleSelectProps;

interface ReplacementItemsLoading {
  readonly isLoading: true;
}
interface ReplacementItemsReady {
  readonly isLoading: false;
  readonly items: readonly SelectItem[];
}
/** The replacement items provided for the values that are selected, but missing in the items. */
export type ReplacementItems = ReplacementItemsLoading | ReplacementItemsReady;

export interface SelectItem {
  /** The internal value of the item. Must be unique among the items. Must not be empty. */
  readonly value: string;
  /**
   * The optional text, used only for internal filtering of the items (when onFilterChange is not specified).
   * If missing in the internal filtering mode, the items are filtered by the value string.
   */
  readonly text?: string;
  /** The item, as displayed in the component when selected. If not specified, the text (or the value) is used. */
  readonly label?: () => JSX.Element;
  /** The item, as displayed on the expanded list. If not specified, label is used. */
  readonly labelOnList?: () => JSX.Element;
  readonly disabled?: boolean;
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
  showClearButton: true,
} satisfies Partial<SelectProps>;

/**
 * A select-like component for selecting a single item from a list of items.
 * Supports searching using keyboard (the parent should provide the filtered list of items).
 *
 * WARNING: The implementation has many workarounds and specific solutions, and the zag component
 * it's based on is still in development and has bugs. It might also change in an incompatible way
 * even between minor versions while it's still on the major version 0. Be very careful when updating
 * the zag library.
 */
export const Select: VoidComponent<SelectProps> = (allProps) => {
  const props = mergeProps(DEFAULT_PROPS, allProps);
  const t = useLangFunc();

  const formContext = useFormContextIfInForm();

  function formValuesEqual(selectValue: string | readonly string[], currentFormValue: string | readonly string[]) {
    return (
      selectValue === currentFormValue ||
      (Array.isArray(selectValue) &&
        Array.isArray(currentFormValue) &&
        selectValue.length === currentFormValue.length &&
        selectValue.every((v, i) => v === currentFormValue[i]))
    );
  }

  // Temporarily assign an empty collection, and overwrite with the actual collection depending on
  // the filtered items later. It's done like this because filtering needs api() which is not created yet.
  let collection: Accessor<Collection<SelectItem>> = () => combobox.collection.empty();

  const [root, setRoot] = createSignal<HTMLDivElement>();
  let portalRoot: HTMLDivElement | undefined;

  // Track the disabled state of the fieldset. This is a workaround, it should happen automatically in the
  // zag component.
  const fieldsetDisabled = useIsFieldsetDisabled(root);

  const [state, send] = useMachine(
    combobox.machine({
      id: createUniqueId(),
      // eslint-disable-next-line solid/reactivity
      name: props.name,
      // Needed but never used, the actual collection comes from the context below.
      collection: combobox.collection.empty(),
      positioning: {
        gutter: 0,
        strategy: "absolute",
        placement: "bottom-end",
        overflowPadding: 10,
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
        } else if (formContext) {
          const valueForForm = props.multiple ? value : value[0] || "";
          if (!formValuesEqual(valueForForm, formContext.form.data(props.name))) {
            formContext.form.setTouched(props.name, true);
            // eslint-disable-next-line solid/reactivity
            formContext.form.setInteracted(() => props.name);
            formContext.form.setIsDirty(true);
            formContext.form.setData(props.name, valueForForm);
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
        const isReallyInside = target instanceof Node && (root()?.contains(target) || portalRoot?.contains(target));
        if (!isReallyInside) {
          api().setInputValue("");
        }
      },
    }),
    {
      context: () => ({
        collection: collection(),
        multiple: props.multiple,
        disabled: props.disabled || fieldsetDisabled(),
        invalid: !isValidationMessageEmpty(formContext?.form.errors(props.name)),
      }),
    },
  );
  const api = createMemo(() => combobox.connect<PropTypes, SelectItem>(state, send, normalizeProps));

  if (formContext)
    createComputed(
      on(
        () => formContext.form.data(props.name),
        (formValue) =>
          api().setValue(Array.isArray(formValue) ? (formValue as string[]) : formValue ? [formValue as string] : []),
      ),
    );
  else
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
  const itemsToShow = createMemo((): readonly SelectItem[] => {
    const filtered = filteredItems();
    if (filtered.length) {
      return filtered;
    }
    if (props.isLoading) {
      return [
        {
          value: `_loading_${createUniqueId()}`,
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
        value: `_noItems_${createUniqueId()}`,
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
  const [itemsMap, setItemsMap] = createSignal<ReadonlyMap<string, SelectItem>>(new Map<string, SelectItem>());
  createComputed(() => {
    setItemsMap((map) => {
      const newMap = new Map(map);
      for (const item of filteredItems()) {
        newMap.set(item.value, item);
      }
      return newMap;
    });
  });
  const unknownValues = createMemo<readonly string[]>(
    () => {
      if (props.isLoading) {
        // If still loading, just assume optimistically all the values will become known.
        return [];
      }
      const knownValues = itemsMap();
      return api()
        .value.filter((value) => !knownValues.has(value))
        .sort();
    },
    [],
    {equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i])},
  );
  const replacementItemsAccessor = createMemo(() =>
    unknownValues().length ? props.getReplacementItems?.(unknownValues()) : undefined,
  );
  // Add items fetched via getMissingCurrentItems to items map, or clear them from the value if missing.
  createComputed(() => {
    if (unknownValues().length) {
      const replacementAccessor = replacementItemsAccessor();
      /**
       * The provided replacement items, or undefined if still loading. If defined, but does not contain all the
       * unknown values, the missing values are considered invalid and are removed from the select.
       */
      let replacementItems: readonly SelectItem[] | undefined;
      if (replacementAccessor) {
        const replacement = replacementAccessor();
        replacementItems = replacement.isLoading ? undefined : replacement.items;
      } else {
        // Are unknown items are invalid because the parent does not provide replacement items.
        replacementItems = [];
      }
      if (replacementItems) {
        if (replacementItems.length) {
          const knownValues = new Map(itemsMap());
          for (const item of replacementItems) {
            knownValues.set(item.value, item);
          }
          // Delay the change so that the component has time to recalculate values.
          setTimeout(() =>
            batch(() => {
              setItemsMap(knownValues);
              api().setValue(api().value.filter((value) => knownValues.has(value)));
            }),
          );
        } else {
          setTimeout(() => api().clearValue());
        }
      }
    }
  });
  /**
   * Returns the label for the specified value. If the value is unknown (not present in itemsMap),
   * small spinner is returned.
   */
  function getValueLabel(value: string) {
    const item = itemsMap().get(value);
    return item ? itemToLabel(item) : <SmallSpinner />;
  }

  // Sometimes api().inputValue is correctly empty, but the input still contains some text, which is probably
  // a bug in the zag component. This is a workaround.
  let input: HTMLInputElement | undefined;
  createEffect(() => {
    if (input) {
      input.value = api().inputValue;
    }
  });

  /** Whether the component is disabled, either directly or via a fieldset. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDisabled = () => (api().controlProps as any)["data-disabled"] !== undefined;

  return (
    <>
      <FieldBox {...props}>
        <PlaceholderField name={props.name} />
        <div
          ref={setRoot}
          {...api().rootProps}
          class={cx(s.select, {
            [s.single!]: !props.multiple,
            [s.multiple!]: props.multiple,
            [s.small!]: props.small,
          })}
          inert={isDisabled() || undefined}
        >
          <div
            {...api().controlProps}
            onClick={() => {
              if (!isDisabled()) {
                api().open();
              }
            }}
          >
            <Switch>
              <Match when={props.multiple}>
                <For each={api().value}>
                  {(value) => (
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
                  )}
                </For>
              </Match>
              <Match when={!props.multiple}>
                {/*
                  The current value is displayed inside the input element, so only display it
                  when the input is empty (like a placeholder).
                */}
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
              class="bg-inherit"
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
                      // Avoid opening the select on button click.
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
                      // Avoid opening the select on button click.
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
      </FieldBox>
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
