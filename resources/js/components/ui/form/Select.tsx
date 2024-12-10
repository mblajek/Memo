import {DetectOverflowOptions, flip, shift} from "@floating-ui/dom";
import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {isValidationMessageEmpty} from "components/felte-form/ValidationMessages";
import {cx, htmlAttributes, useLangFunc} from "components/utils";
import {FieldsetDisabledTracker} from "components/utils/fieldset_disabled_tracker";
import {hasProp} from "components/utils/props";
import {AiFillCaretDown} from "solid-icons/ai";
import {FiDelete} from "solid-icons/fi";
import {ImCross, ImSpinner2} from "solid-icons/im";
import {RiSystemDeleteBin6Line} from "solid-icons/ri";
import {
  Accessor,
  For,
  JSX,
  Match,
  ParentComponent,
  Show,
  Switch,
  VoidComponent,
  batch,
  createComputed,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  on,
  onCleanup,
  onMount,
  splitProps,
} from "solid-js";
import {Button} from "../Button";
import {Floating, middleware} from "../Floating";
import {SmallSpinner} from "../Spinner";
import {FieldBox} from "./FieldBox";
import {PlaceholderField} from "./PlaceholderField";
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
   * Creates a group header on the list for the specified group id. If not specified and items use grouping,
   * the group name string is used directly.
   */
  readonly getGroupHeader?: (groupName: string) => JSX.Element;
  /**
   * Function called when the current value is unknown, i.e. there was never an item with this value in items, so
   * the component doesn't know how to display it. It is also called when the item is known, but it has
   * requestReplacementWhenSelected set.
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
  readonly closeOnSelect?: boolean;
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
  /**
   * The internal value of the item. Must be unique among the items. Regular items must have non-empty values.
   * An empty value is a special item that clears the Select when selected.
   */
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
  readonly groupName?: string;
  /**
   * Whether this item, once selected, should be treated as an unknown item, and a replacement item should be requested.
   *
   * This is useful if the item only contains partial data about itself, and more data is needed when the item
   * is actually selected.
   */
  readonly requestReplacementWhenSelected?: boolean;
}

interface SelectItemInternal extends SelectItem {
  readonly groupHeader?: boolean;
}

function itemToString(item: SelectItem) {
  return item.text || item.value;
}
function itemToLabel(item: SelectItem) {
  return item.label ? <>{item.label()}</> : <>{itemToString(item)}</>;
}
function itemToLabelOnList(item: SelectItem) {
  return item.labelOnList ? (
    <>{item.labelOnList()}</>
  ) : (
    <IndentSelectItemInGroup indent={!!item.groupName}>{itemToLabel(item)}</IndentSelectItemInGroup>
  );
}

const DEFAULT_PROPS = {
  isLoading: false,
  small: false,
  showClearButton: true,
} satisfies Partial<SelectProps>;

const DETECT_OVERFLOW_OPTIONS = {
  padding: 5,
} satisfies DetectOverflowOptions;

const isOpenSetters = new Set<(open: boolean) => void>();

/**
 * A select-like component for selecting a single item from a list of items.
 * Supports searching using keyboard (the parent should provide the filtered list of items).
 */
export const Select: VoidComponent<SelectProps> = (allProps) => {
  const props = mergeProps(DEFAULT_PROPS, allProps);
  const t = useLangFunc();
  const formContext = useFormContextIfInForm();

  const isInvalid = () => !isValidationMessageEmpty(formContext?.form.errors(props.name));
  const [isOpen, setIsOpen] = createSignal(false);
  onMount(() => {
    isOpenSetters.add(setIsOpen);
    onCleanup(() => isOpenSetters.delete(setIsOpen));
  });
  const [filterText, setFilterText] = createSignal("");
  const [selection, selectionSetter] = createSignal<ReadonlySet<string>>(new Set());

  function setSelection(newSel: string[] | ReadonlySet<string>) {
    const newSelArr = Array.isArray(newSel) ? newSel : [...newSel];
    const oldSel = selection();
    if (newSelArr.length === oldSel.size && newSelArr.every((v) => oldSel.has(v))) {
      return;
    }
    selectionSetter(Array.isArray(newSel) ? new Set(newSel) : newSel);
    if (props.onValueChange) {
      if (props.multiple) {
        props.onValueChange(newSelArr);
      } else {
        props.onValueChange(newSelArr[0]);
      }
    } else if (formContext) {
      const valueForForm = props.multiple ? newSelArr : newSelArr[0] || "";
      if (!formValuesEqual(valueForForm, formContext.form.data(props.name))) {
        formContext.form.setTouched(props.name, true);
        // eslint-disable-next-line solid/reactivity
        formContext.form.setInteracted(() => props.name);
        formContext.form.setIsDirty(true);
        formContext.form.setData(props.name, valueForForm);
      }
    }
    // Clear the filtering, in case the user wants to select another item later.
    setFilterText("");
    if (newSelArr.length && (props.multiple ? props.closeOnSelect : true)) {
      setIsOpen(false);
    }
  }
  function clearSelection() {
    setSelection([]);
  }
  function addSelection(sel: string) {
    if (!selection().has(sel)) {
      setSelection(props.multiple ? new Set(selection()).add(sel) : [sel]);
      return true;
    }
    return false;
  }
  function delSelection(val: string) {
    if (selection().has(val)) {
      if (props.multiple) {
        const newSel = new Set(selection());
        newSel.delete(val);
        setSelection(newSel);
      } else if (props.nullable) {
        clearSelection();
      }
      return true;
    }
    return false;
  }
  function toggleSelection(val: string) {
    if (!addSelection(val)) {
      delSelection(val);
    }
  }
  function retainSelection(retain: ReadonlySetLike<string>) {
    if (props.multiple) {
      const newSel = new Set(selection());
      for (const sel of newSel) {
        if (!retain.has(sel)) {
          newSel.delete(sel);
        }
      }
      setSelection(newSel);
    } else if (selection().size && !retain.has(selection().keys().next().value!)) {
      clearSelection();
    }
  }
  createComputed(() => {
    if (typeof props.onFilterChange === "function") {
      props.onFilterChange(filterText() || undefined);
    }
  });

  if (hasProp(props, "value"))
    createComputed(
      on(
        () => props.value,
        (propsValue) =>
          setSelection(
            Array.isArray(propsValue) ? (propsValue as string[]) : propsValue === undefined ? [] : [propsValue],
          ),
      ),
    );
  else if (formContext)
    createComputed(
      on(
        () => formContext.form.data(props.name),
        (formValue) => {
          if (Array.isArray(formValue)) {
            setSelection(formValue as string[]);
          } else if (formValue == undefined || formValue === "") {
            clearSelection();
            formContext.form.setData(props.name, props.multiple ? [] : "");
          } else {
            setSelection([formValue as string]);
          }
        },
      ),
    );

  onMount(() => {
    if (!props.multiple && !props.nullable && !props.value) {
      const enabledItems = props.items.filter((item) => !item.disabled);
      if (enabledItems.length === 1) {
        setSelection([enabledItems[0]!.value]);
      }
    }
  });
  const isInternalFilteringMode = () => props.onFilterChange === "internal";
  /** The items after filtering, regardless of the filtering mode. */
  const filteredItems = createMemo(() => {
    if (isInternalFilteringMode()) {
      const filter = filterText().toLocaleLowerCase();
      if (!filter) {
        return props.items;
      }
      return props.items.filter((item) => itemToString(item).toLocaleLowerCase().includes(filter));
    }
    return props.items;
  });
  const itemsToShow = createMemo<readonly SelectItem[]>(() => {
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
        label: () => <>{t(filterText() ? "select.no_matching_items" : "select.no_items")}</>,
        disabled: true,
      },
    ];
  });
  const itemsToShowWithHeaders = createMemo<readonly SelectItemInternal[]>(() => {
    const res: SelectItemInternal[] = [];
    let groupName: string | undefined = undefined;
    for (const item of itemsToShow()) {
      if (item.groupName !== groupName) {
        groupName = item.groupName;
        if (groupName) {
          const grName = groupName;
          function labelOnList() {
            if (props.getGroupHeader) {
              const groupHeader = props.getGroupHeader(grName);
              return typeof groupHeader === "string" ? (
                <DefaultSelectItemsGroupHeader groupName={groupHeader} />
              ) : (
                groupHeader
              );
            } else {
              return <DefaultSelectItemsGroupHeader groupName={grName} />;
            }
          }
          res.push({
            value: `_group_${grName}_${createUniqueId()}`,
            labelOnList,
            groupName,
            groupHeader: true,
            disabled: !props.multiple,
          });
        }
      }
      res.push(item);
    }
    return res;
  });

  /**
   * A map for storing all the encountered items. This is needed to show the selected item(s) when
   * a filter is present, because otherwise the items don't exist on the list.
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
      if (props.isLoading || itemsMap().size < filteredItems().length) {
        // If still loading, just assume optimistically all the values will become known.
        return [];
      }
      const knownValues = itemsMap();
      return [...selection()]
        .filter((value) => {
          const known = knownValues.get(value);
          return !known || known.requestReplacementWhenSelected;
        })
        .sort();
    },
    [],
    {equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i])},
  );
  const replacementItemsAccessor = createMemo(() =>
    unknownValues().length ? props.getReplacementItems?.(unknownValues()) : undefined,
  );
  // Add items fetched via getReplacementItems to items map, or clear them from the value if missing.
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
        // All the unknown items are invalid because the parent does not provide replacement items.
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
              retainSelection(knownValues);
            }),
          );
        } else {
          retainSelection(itemsMap());
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

  /** Toggles the selection of all the items in the group. Call with the index of the header inside itemsToShowWithHeaders(). */
  function toggleGroupSelection(groupHeaderIndex: number) {
    if (!props.multiple) {
      return;
    }
    const header = itemsToShowWithHeaders()[groupHeaderIndex];
    if (!header?.groupHeader) {
      throw new Error(`Expected group header at index ${groupHeaderIndex}, got: ${JSON.stringify(header)}`);
    }
    const startIndex = groupHeaderIndex + 1;
    let endIndex = startIndex;
    while (
      itemsToShowWithHeaders()[endIndex]?.groupName === header.groupName &&
      !itemsToShowWithHeaders()[endIndex]?.groupHeader
    )
      endIndex++;
    const groupItems = itemsToShowWithHeaders().slice(startIndex, endIndex);
    const newSelection = new Set(selection());
    const hasUnselected = groupItems.some(({value}) => !newSelection.has(value));
    if (hasUnselected) {
      for (const {value} of groupItems) {
        newSelection.add(value);
      }
    } else {
      for (const {value} of groupItems) {
        newSelection.delete(value);
      }
    }
    setSelection(newSelection);
  }

  const chipValues = () => {
    const chipValues = [];
    for (const [itemValue] of itemsMap()) {
      if (selection().has(itemValue)) {
        chipValues.push(itemValue);
      }
    }
    chipValues.push(...unknownValues());
    return chipValues;
  };

  const allowOverlap = () => props.multiple && !filterText();

  let control: HTMLDivElement | undefined;
  let input: HTMLInputElement | undefined;
  const [list, setList] = createSignal<HTMLUListElement>();
  const inputProps: htmlAttributes.input = {};

  const [focusedItem, setFocusedItem] = createSignal<SelectItemInternal>();
  const [isKeyboardFocus, setIsKeyboardFocus] = createSignal(false);
  function moveKeyboardFocus(dir: number, canWrap = false) {
    const enabledItems = itemsToShowWithHeaders().filter((item) => !item.disabled);
    if (!enabledItems.length) {
      return;
    }
    const maxInd = enabledItems.length - 1;
    let ind = 0;
    if (focusedItem()) {
      ind = enabledItems.indexOf(focusedItem()!);
      if (ind < 0) {
        ind = 0;
      } else {
        const newInd = ind + dir;
        if (newInd < 0) {
          ind = ind > 0 ? 0 : canWrap ? maxInd : 0;
        } else if (newInd > maxInd) {
          ind = ind < maxInd ? maxInd : canWrap ? 0 : maxInd;
        } else {
          ind = newInd;
        }
      }
    }
    const newFocusedItem = enabledItems[ind]!;
    setFocusedItem(newFocusedItem);
    setIsKeyboardFocus(true);
    setTimeout(() => {
      [...(list()?.children || [])]
        .find((li) => li instanceof HTMLElement && li.dataset.value === newFocusedItem.value)
        ?.scrollIntoView({block: "nearest"});
    });
  }
  createComputed(
    on(itemsToShowWithHeaders, (itemsToShowWithHeaders) => {
      if (focusedItem() && !itemsToShowWithHeaders.includes(focusedItem()!)) {
        setFocusedItem(undefined);
      }
    }),
  );
  const moveKeys: Record<string, number> = {
    ArrowDown: 1,
    ArrowUp: -1,
    PageDown: 10,
    PageUp: -10,
    Home: -Infinity,
    End: Infinity,
  } as const;
  function handleKey(e: KeyboardEvent) {
    const move = moveKeys[e.key];
    if (move) {
      e.preventDefault();
      setIsOpen(true);
      moveKeyboardFocus(move, !e.repeat && Number.isFinite(move));
    } else if (e.key === "Enter" || e.key === " ") {
      if (isOpen()) {
        if (focusedItem() && (e.key === "Enter" || isKeyboardFocus())) {
          e.preventDefault();
          activateItem(focusedItem()!);
        }
      } else if (e.key === "Enter" || !filterText()) {
        e.preventDefault();
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      if (isOpen() || filterText()) {
        e.preventDefault();
        setFilterText("");
        setIsOpen(false);
      }
    }
  }

  function activateItem(item: SelectItemInternal, index?: number) {
    if (item.disabled) {
      return;
    }
    if (item.groupHeader) {
      index ??= itemsToShowWithHeaders().indexOf(item);
      if (index >= 0) {
        toggleGroupSelection(index);
      }
    } else if (item.value) {
      toggleSelection(item.value);
    } else {
      clearSelection();
      setIsOpen(false);
    }
  }

  let lastPopOverPointerPos: readonly [number, number] | undefined;

  function onFocusIn(e: FocusEvent) {
    if (input && e.target !== input) {
      input.focus();
    }
  }
  function onFocusOut(e: FocusEvent) {
    if (
      !e.relatedTarget ||
      !(e.relatedTarget instanceof Node) ||
      !(e.currentTarget instanceof Node) ||
      (!control?.contains(e.relatedTarget) && !list()?.contains(e.relatedTarget))
    ) {
      setFilterText("");
      setIsOpen(false);
    }
  }

  return (
    <FieldsetDisabledTracker
      ref={control}
      class="outline-none"
      onFocusIn={onFocusIn}
      onFocusOut={onFocusOut}
      tabindex="0"
      onKeyDown={handleKey}
    >
      {(isFieldsetDisabled) => {
        const isDisabled = () => props.disabled || isFieldsetDisabled();

        createComputed(() => {
          if (filterText() && !isOpen()) {
            setIsOpen(true);
          }
        });

        const clearButton = createMemo(() => {
          // Display at most one clear button at a time.
          if (isDisabled()) {
            return undefined;
          }
          if (filterText()) {
            return (
              <Button
                onClick={() => {
                  setFilterText("");
                  input?.focus();
                }}
                title={t("actions.clear")}
              >
                <FiDelete />
              </Button>
            );
          }
          if (!selection().size) {
            return undefined;
          }
          if (props.multiple) {
            if (props.showClearButton) {
              return (
                <Button
                  onClick={(e) => {
                    // Avoid opening the select on button click.
                    e.stopPropagation();
                    clearSelection();
                  }}
                  title={t("actions.clear")}
                >
                  {/* Use a bin icon for multiple select because it looks more destructive, which is appropriate. */}
                  <RiSystemDeleteBin6Line />
                </Button>
              );
            }
          } else {
            if (props.nullable) {
              return (
                <Button
                  onClick={(e) => {
                    // Avoid opening the select on button click.
                    e.stopPropagation();
                    clearSelection();
                  }}
                  title={t("actions.clear")}
                >
                  <FiDelete />
                </Button>
              );
            }
          }
          return undefined;
        });

        const buttonsWidth = () => (clearButton() ? "35px" : "17px");
        const paddingStyle = () => {
          const x = props.multiple ? (props.small ? "1px" : "0.25rem") : props.small ? "0.25rem" : "0.5rem";
          return `1px calc(${buttonsWidth()} + ${x}) 1px ${x}`;
        };

        const Buttons: VoidComponent = () => {
          return (
            <div class="absolute top-0.5 bottom-0.5 right-0.5 flex items-stretch gap-0.5 bg-inherit">
              {clearButton()}
              <Button
              // The onClick handler from the whole component is used to open/close.
              >
                <AiFillCaretDown class={cx("text-black", isDisabled() ? "text-opacity-30" : undefined)} />
              </Button>
            </div>
          );
        };

        const selectAriaProps = () =>
          ({
            "role": "combobox",
            "aria-expanded": isOpen(),
            "aria-controls": list()?.id,
            "aria-haspopup": "listbox",
            "aria-multiselectable": props.multiple ?? false,
          }) satisfies htmlAttributes.div;
        return (
          <FieldBox {...props}>
            <PlaceholderField name={props.name} />
            <Floating
              reference={
                <Switch>
                  <Match when={props.multiple}>
                    <div
                      class={cx(
                        "grow min-w-8 h-full border border-input-border rounded overflow-hidden flex flex-wrap items-center gap-0.5 relative",
                        props.small ? "min-h-small-input" : "min-h-big-input",
                        isDisabled() ? "bg-disabled" : "bg-white",
                        isInvalid() ? "border-red-400" : undefined,
                      )}
                      style={{padding: paddingStyle()}}
                      {...selectAriaProps()}
                      onClick={[setIsOpen, !isOpen()]}
                      bool:inert={isDisabled()}
                    >
                      <For each={chipValues()}>
                        {(chipValue) => (
                          <div class="px-1 border border-input-border rounded flex gap-0.5">
                            <div class="wrapTextAnywhere">{getValueLabel(chipValue)}</div>
                            <Button
                              class="px-0.5"
                              onClick={(e) => {
                                // Avoid opening the select.
                                e.stopPropagation();
                                delSelection(chipValue);
                              }}
                            >
                              <ImCross
                                class={cx("text-black", isDisabled() ? "text-opacity-30" : undefined)}
                                size="8"
                              />
                            </Button>
                          </div>
                        )}
                      </For>
                      <input
                        ref={input}
                        {...inputProps}
                        // This is just for user entry, and not the actual form value.
                        name=""
                        class="grow shrink basis-0 px-1 w-8 bg-inherit outline-none rounded"
                        value={filterText()}
                        onInput={(e) => setFilterText(e.currentTarget.value)}
                        placeholder={selection().size ? undefined : props.placeholder}
                        // Without filtering, the input is used just for the placeholder.
                        bool:inert={!props.onFilterChange}
                      />
                      <Buttons />
                    </div>
                  </Match>
                  <Match when="single">
                    <div
                      class={cx(
                        "grow min-w-8 h-full border border-input-border rounded relative grid",
                        props.small ? "min-h-small-input" : "min-h-big-input",
                        isDisabled() ? "bg-disabled" : "bg-white",
                        isInvalid() ? "border-red-400" : undefined,
                      )}
                      {...selectAriaProps()}
                      onClick={[setIsOpen, !isOpen()]}
                      bool:inert={isDisabled()}
                    >
                      {/*
                          The current value is displayed inside the input element, so only display it
                          when the input is empty (like a placeholder).
                        */}
                      <Show when={!filterText() && selection().keys().next().value}>
                        {(selValue) => (
                          <div
                            class="col-start-1 row-start-1 my-auto overflow-hidden wrapTextAnywhere"
                            style={{padding: paddingStyle()}}
                          >
                            {getValueLabel(selValue())}
                          </div>
                        )}
                      </Show>
                      <input
                        ref={input}
                        {...inputProps}
                        // This is just for user entry, and not the actual form value.
                        name=""
                        class="col-start-1 row-start-1 min-w-0 bg-transparent rounded"
                        style={{padding: paddingStyle()}}
                        value={filterText()}
                        onInput={(e) => setFilterText(e.currentTarget.value)}
                        placeholder={selection().size ? undefined : props.placeholder}
                        // Without filtering, the input is used just for the placeholder.
                        bool:inert={!props.onFilterChange}
                      />
                      <Buttons />
                    </div>
                  </Match>
                </Switch>
              }
              floating={(posStyle) => {
                function elemId(value: string) {
                  return `${props.name}__item_${value}`;
                }
                return (
                  <Show when={isOpen()}>
                    <ul
                      id={`${props.name}__dropdown`}
                      ref={setList}
                      class={cx(
                        "z-dropdown max-w-fit border rounded overflow-x-clip overflow-y-auto shadow-xl",
                        props.isLoading ? "bg-gray-200" : "bg-popup-bg",
                      )}
                      style={posStyle()}
                      role="listbox"
                      aria-activedescendant={focusedItem() ? elemId(focusedItem()!.value) : undefined}
                      onPointerMove={(e) => {
                        lastPopOverPointerPos = [e.clientX, e.clientY];
                      }}
                      onPointerEnter={(e) => {
                        lastPopOverPointerPos = [e.clientX, e.clientY];
                      }}
                      onPointerLeave={() => {
                        lastPopOverPointerPos = undefined;
                      }}
                      onFocusIn={onFocusIn}
                      onFocusOut={onFocusOut}
                    >
                      <For each={itemsToShowWithHeaders()}>
                        {(item, i) => (
                          <li
                            id={elemId(item.value)}
                            class={cx(
                              "px-0.5 border-x-2 border-transparent wrapTextAnywhere overflow-x-clip text-black",
                              selection().has(item.value) ? "border-s-memo-active bg-select" : undefined,
                              item === focusedItem()
                                ? ["bg-hover", isKeyboardFocus() ? "border-e-gray-400" : undefined]
                                : undefined,
                              props.small ? "py-0.5" : "py-1",
                              item.disabled || props.isLoading ? "cursor-default" : "cursor-pointer",
                              props.isLoading ? "text-opacity-40" : item.disabled ? "text-opacity-60" : undefined,
                            )}
                            tabindex="0"
                            role="option"
                            aria-selected={item.disabled ? undefined : selection().has(item.value)}
                            onPointerEnter={(e) => {
                              if (
                                lastPopOverPointerPos &&
                                e.clientX === lastPopOverPointerPos[0] &&
                                e.clientY === lastPopOverPointerPos[1]
                              ) {
                                // Prevent focusing the item if it's the list that scrolls and not the mouse that moves.
                                return;
                              }
                              if (item.disabled) {
                                if (!isKeyboardFocus()) {
                                  setFocusedItem(undefined);
                                  setIsKeyboardFocus(false);
                                }
                              } else {
                                setFocusedItem(item);
                                setIsKeyboardFocus(false);
                              }
                            }}
                            onClick={() => activateItem(item, i())}
                            data-value={item.value}
                          >
                            {itemToLabelOnList(item)}
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                );
              }}
              options={{
                placement: "bottom-end",
                middleware: [
                  flip({crossAxis: false, ...DETECT_OVERFLOW_OPTIONS}),
                  shift({crossAxis: allowOverlap(), ...DETECT_OVERFLOW_OPTIONS}),
                  middleware.reactiveSize({
                    ...DETECT_OVERFLOW_OPTIONS,
                    getFloatingStyle: (state) => ({
                      ...middleware.reactiveSize.getMaxSizeStyle(state),
                      ...middleware.reactiveSize.getMatchWidthStyle(state),
                    }),
                  }),
                ],
              }}
            />
          </FieldBox>
        );
      }}
    </FieldsetDisabledTracker>
  );
};

function formValuesEqual(selectValue: string | readonly string[], currentFormValue: string | readonly string[]) {
  return (
    selectValue === currentFormValue ||
    (Array.isArray(selectValue) &&
      Array.isArray(currentFormValue) &&
      selectValue.length === currentFormValue.length &&
      selectValue.every((v, i) => v === currentFormValue[i]))
  );
}

interface IndentSelectItemInGroupProps extends htmlAttributes.div {
  readonly indent?: boolean;
}

export const IndentSelectItemInGroup: ParentComponent<IndentSelectItemInGroupProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["indent"]);
  return <div {...htmlAttributes.merge(divProps, {class: (props.indent ?? true) ? "pl-3" : undefined})} />;
};

export const DefaultSelectItemsGroupHeader: VoidComponent<{readonly groupName: string}> = (props) => (
  <div class="font-semibold text-gray-700 mt-1">{props.groupName}</div>
);

export function closeAllSelects() {
  for (const isOpenSetter of isOpenSetters) {
    isOpenSetter(false);
  }
}
