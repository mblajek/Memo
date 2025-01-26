import {useFormContext} from "components/felte-form/FelteForm";
import {WRAPPED_FIELD_KEY, wrapArrayOfPrimitiveValues} from "components/felte-form/wrapped_fields";
import {cx} from "components/utils/classnames";
import {FieldsetDisabledTracker} from "components/utils/fieldset_disabled_tracker";
import {htmlAttributes} from "components/utils/html_attributes";
import {BsChevronCompactDown, BsChevronCompactUp} from "solid-icons/bs";
import {Accessor, Index, JSX, Show, VoidComponent, createEffect, createMemo, on, splitProps} from "solid-js";
import {Button} from "../Button";
import {actionIcons} from "../icons";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";

export interface MultiFieldData {
  readonly name: string;
  readonly length: Accessor<number>;
  readonly items: Accessor<ItemData[]>;
  /** Appends the value to the field. */
  addLast(value: unknown): void;
}

interface ItemData {
  readonly index: number;
  /** The name that should be used for this particular item. */
  readonly name: string;
  readonly isLast: Accessor<boolean>;
  /** Removes this position from the array, making it shorter. */
  remove(): void;
  /** Adds the new value directly after this item. */
  addAfter(value: unknown): void;
  moveUp(): void;
  moveDown(): void;
  moveTo(newIndex: number): void;
}

/**
 * Creates information about an array field in a form. The information can be iterated over to produce
 * the sub-fields for the array items.
 *
 * If the primitiveType argument is specified, the array items are automatically wrapped in objects,
 * as Felte does not support arrays of non-objects. The values are automatically unwrapped at submit
 * (see FelteForm).
 */
export function useMultiField(name: string, {primitiveType = false} = {}): MultiFieldData {
  const form = useFormContext().form;
  const data = () => {
    const value = form.data(name);
    return value == undefined ? [] : (value as unknown[]);
  };
  if (primitiveType) {
    createEffect(() => {
      // Wrap the values initially, and then e.g. after form reset.
      const wrappedValues = wrapArrayOfPrimitiveValues(data());
      if (wrappedValues) {
        form.setFields(name, wrappedValues);
      }
    });
  }
  function formAddField(value: unknown, index?: number) {
    form.addField(name, primitiveType ? {[WRAPPED_FIELD_KEY]: value} : value, index);
  }
  const items = createMemo(() =>
    data().map(
      (_value, index): ItemData => ({
        index,
        name: `${name}.${index}${primitiveType ? `.${WRAPPED_FIELD_KEY}` : ""}`,
        isLast: () => index === data().length - 1,
        remove() {
          form.moveField(name, index, data().length - 1);
          form.setFields(name, data().slice(0, -1));
        },
        addAfter(value) {
          formAddField(value, index + 1);
        },
        moveUp() {
          this.moveTo(index - 1);
        },
        moveDown() {
          this.moveTo(index + 1);
        },
        moveTo(newIndex) {
          if (newIndex >= 0 && newIndex < data().length) {
            form.moveField(name, index, newIndex);
          }
        },
      }),
    ),
  );
  return {
    name,
    length: () => data().length,
    items,
    addLast: formAddField,
  };
}

interface SimpleMultiFieldProps extends htmlAttributes.div {
  readonly name: string;
  readonly primitiveType?: boolean;
  /** The function that produces a raw field for an item. The name should be used directly to name the field. */
  readonly field: (name: string, data: ItemData) => JSX.Element;
  /** Whether to include buttons to move items up and down. */
  readonly moveButtons?: boolean;
  /** If specified, a function called when the user adds an item. The result is appended to the array field. */
  readonly addAtEndValue?: () => unknown;
}

const BUTTON_WIDTH = "26px";

/**
 * A simple component displaying an array field.
 *
 * The component shows the fields for individual items, and buttons to control the values (unless the form is
 * disabled): delete (to delete an individual array), optionally move up and down (to change the order of the items),
 * and add (to add a new item at the end).
 */
export const SimpleMultiField: VoidComponent<SimpleMultiFieldProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["name", "primitiveType", "field", "moveButtons", "addAtEndValue"]);
  // eslint-disable-next-line solid/reactivity
  const multiField = useMultiField(props.name, {primitiveType: props.primitiveType});
  const numButtonCols = () => (props.moveButtons ? 1 : 0) + 1 /* delete button */ + (props.addAtEndValue ? 1 : 0);
  return (
    <FieldsetDisabledTracker {...htmlAttributes.merge(divProps, {class: "flex flex-col items-stretch gap-px"})}>
      {(isFieldsetDisabled) => {
        /** Add an empty value at the end, and try to focus the added field. */
        function addAtEnd() {
          if (isFieldsetDisabled() || !props.addAtEndValue) {
            return;
          }
          multiField.addLast(props.addAtEndValue());
          setTimeout(() => {
            const addedInputName = multiField.items().at(-1)?.name;
            if (addedInputName) {
              const input = document.getElementById(addedInputName);
              if (input instanceof HTMLElement) {
                input.focus();
              }
            }
          });
        }
        return (
          <>
            <Index each={multiField.items()}>
              {(params) => {
                const field = createMemo(
                  on(
                    () => props.field,
                    (field) => field(params().name, params()),
                  ),
                );
                return (
                  <div class="flex gap-1">
                    <div class="grow">{field()}</div>
                    <Show when={!isFieldsetDisabled()}>
                      <div
                        class="grid gap-px"
                        style={{
                          "grid-template-columns": `repeat(${numButtonCols()}, ${BUTTON_WIDTH})`,
                        }}
                      >
                        <Show when={props.moveButtons}>
                          <div class="flex flex-col min-h-small-input">
                            <Button
                              class="secondary small !rounded-b-none !min-h-0 basis-0 grow flex items-center justify-center"
                              onClick={() => params().moveUp?.()}
                              disabled={!params().index}
                            >
                              <BsChevronCompactUp class="text-current" />
                            </Button>
                            <Button
                              class="secondary small !rounded-t-none -mt-px !min-h-0 basis-0 grow flex items-center justify-center"
                              onClick={() => params().moveDown?.()}
                              disabled={params().isLast()}
                            >
                              <BsChevronCompactDown class="text-current" />
                            </Button>
                          </div>
                        </Show>
                        <Button
                          class={cx(
                            "secondary small !min-h-small-input flex items-center justify-center",
                            props.addAtEndValue && !params().isLast() ? "col-span-2" : undefined,
                          )}
                          onClick={() => params().remove()}
                        >
                          <actionIcons.Delete class="text-current" />
                        </Button>
                        <Show when={params().isLast() && props.addAtEndValue}>
                          {/* Add button after the last item. */}
                          <Button
                            class="secondary small !min-h-small-input flex items-center justify-center"
                            onClick={addAtEnd}
                          >
                            <actionIcons.Add class="text-current" />
                          </Button>
                        </Show>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </Index>
            <Show when={!multiField.length()}>
              <div class="flex gap-1 items-center justify-between min-h-small-input">
                <Show when={!isFieldsetDisabled() && props.addAtEndValue} fallback={<EmptyValueSymbol />}>
                  {/* Add button on a line by itself when there are no items. */}
                  <Button class="flex-grow text-start" onClick={addAtEnd}>
                    <EmptyValueSymbol />
                  </Button>
                  <div class="flex justify-end">
                    <Button
                      class="secondary small !min-h-small-input flex items-center justify-center"
                      style={{width: BUTTON_WIDTH}}
                      onClick={addAtEnd}
                    >
                      <actionIcons.Add class="text-current" />
                    </Button>
                  </div>
                </Show>
              </div>
            </Show>
          </>
        );
      }}
    </FieldsetDisabledTracker>
  );
};
