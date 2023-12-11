import {cx, htmlAttributes} from "components/utils";
import {For, JSX, Show, VoidComponent, createMemo, createRenderEffect, createSignal, splitProps} from "solid-js";
import {EMPTY_VALUE_SYMBOL} from "../symbols";

export type ResourcesSelectionMode = "radio" | "checkbox";

interface Props extends htmlAttributes.div {
  readonly resourceGroups?: readonly ResourceGroup[];
  readonly mode: ResourcesSelectionMode;
  readonly selection: ReadonlySet<string>;
  readonly setSelection: (ids: ReadonlySet<string>) => void;
}

export interface ResourceGroup {
  readonly label: () => JSX.Element;
  readonly resources: readonly Resource[];
}

export interface Resource {
  readonly id: string;
  readonly label: () => JSX.Element;
}

/** A vertical list of people and resources, with checkboxes or radio buttons, depending on mode. */
export const ResourcesSelector: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["resourceGroups", "mode", "selection", "setSelection"]);
  return (
    <div {...htmlAttributes.merge(divProps, {class: "flex flex-col gap-2"})}>
      <For each={props.resourceGroups}>
        {({label, resources}, i) => {
          const checkboxId = () => (props.mode === "checkbox" ? `resourceGroup_${i()}` : undefined);
          const [checkbox, setCheckbox] = createSignal<HTMLInputElement>();
          const state = createMemo(() => {
            if (!checkboxId()) {
              return undefined;
            }
            const sel = props.selection;
            return {
              all: resources.every((r) => sel.has(r.id)),
              none: resources.every((r) => !sel.has(r.id)),
            };
          });
          const checked = () => state()?.all && !state()?.none;
          const indeterminate = () => !state()?.all && !state()?.none;
          // Make the group checkbox indeterminate if some resources are selected and some are not.
          createRenderEffect(() => {
            const checkboxInput = checkbox();
            if (checkboxInput) {
              checkboxInput.indeterminate = indeterminate();
            }
          });
          return (
            <div class="flex flex-col">
              <Show when={checkboxId()} fallback={<div class="px-1">{label()}</div>}>
                <label for={checkboxId()} class="px-1 flex gap-1 items-center hover:bg-hover">
                  <input
                    ref={setCheckbox}
                    id={checkboxId()}
                    type="checkbox"
                    checked={checked()}
                    disabled={!resources.length}
                    onClick={() => {
                      const sel = new Set(props.selection);
                      if (checked()) {
                        for (const res of resources) {
                          sel.delete(res.id);
                        }
                      } else {
                        for (const res of resources) {
                          sel.add(res.id);
                        }
                      }
                      props.setSelection(sel);
                    }}
                    onDblClick={() => {
                      if (resources.length) {
                        props.setSelection(new Set(resources.map((r) => r.id)));
                      }
                    }}
                  />
                  {label()}
                </label>
              </Show>
              <div class="flex flex-col">
                <For each={resources} fallback={<span class="px-1">{EMPTY_VALUE_SYMBOL}</span>}>
                  {({id, label}) => {
                    const inputId = `resourceSelected_${id}`;
                    const checked = () => props.selection.has(id);
                    return (
                      <label
                        for={inputId}
                        class={cx("px-1 flex gap-1 items-center hover:bg-hover", {
                          "bg-select hover:bg-select": checked(),
                        })}
                      >
                        <Show
                          when={props.mode === "checkbox"}
                          // Replace the input when the mode changes to avoid strange interactions
                          // with the checked state.
                          fallback={
                            <input
                              type="radio"
                              id={inputId}
                              name="selectedResources"
                              checked={checked()}
                              onClick={() => props.setSelection(new Set([id]))}
                            />
                          }
                        >
                          <input
                            type="checkbox"
                            id={inputId}
                            name={inputId}
                            checked={checked()}
                            onClick={() => {
                              const sel = new Set(props.selection);
                              if (checked()) {
                                sel.delete(id);
                              } else {
                                sel.add(id);
                              }
                              props.setSelection(sel);
                            }}
                            // TODO: Consider a different way to select a solo resource.
                            onDblClick={() => props.setSelection(new Set([id]))}
                          />
                        </Show>
                        {label()}
                      </label>
                    );
                  }}
                </For>
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
};
