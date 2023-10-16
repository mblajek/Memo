import {cx, htmlAttributes} from "components/utils";
import {For, JSX, Show, VoidComponent, createMemo, createRenderEffect, createSignal, splitProps} from "solid-js";

export type ResourcesSelectionMode = "radio" | "checkbox";

interface Props extends htmlAttributes.div {
  resourceGroups?: readonly ResourceGroup[];
  mode: ResourcesSelectionMode;
  selection: readonly string[];
  setSelection: (ids: string[]) => void;
}

export interface ResourceGroup {
  readonly label: () => JSX.Element;
  readonly resources: readonly Resource[];
}

export interface Resource {
  readonly id: string;
  readonly label: () => JSX.Element;
}

/**
 * A vertical list of people and resources, with checkboxes or radio buttons, depending on mode.
 */
export const ResourcesSelector: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["resourceGroups", "mode", "selection", "setSelection"]);
  const selected = createMemo(() => new Set(props.selection));
  let div: HTMLDivElement | undefined;
  return (
    <div ref={div} {...htmlAttributes.merge(divProps, {class: "flex flex-col gap-2"})}>
      <For each={props.resourceGroups}>
        {({label, resources}, i) => {
          const inputId = () => (props.mode === "checkbox" ? `resourceGroup_${i()}` : undefined);
          const [input, setInput] = createSignal<HTMLInputElement>();
          const state = createMemo(() => {
            if (!inputId()) {
              return undefined;
            }
            const sel = new Set(props.selection);
            let all = true;
            let none = true;
            for (const resource of resources)
              if (sel.has(resource.id)) {
                none = false;
              } else {
                all = false;
              }
            return {all, none};
          });
          // Make the group checkbox indeterminate if some resources are selected and some are not.
          createRenderEffect(() => {
            const inp = input();
            if (inp) {
              const s = state();
              inp.indeterminate = !!s && s.all === s.none;
            }
          });
          return (
            <div class="flex flex-col">
              <Show when={inputId()} fallback={<div class="px-1">{label()}</div>}>
                <label for={inputId()} class="px-1 flex gap-1 items-center hover:bg-hover">
                  <input
                    ref={setInput}
                    id={inputId()}
                    type="checkbox"
                    checked={state()?.all}
                    onClick={({target}) => {
                      const sel = new Set(props.selection);
                      if ((target as HTMLInputElement).checked) {
                        for (const res of resources) {
                          sel.add(res.id);
                        }
                      } else {
                        for (const res of resources) {
                          sel.delete(res.id);
                        }
                      }
                      props.setSelection([...sel]);
                    }}
                  />
                  {label()}
                </label>
              </Show>
              <div class="flex flex-col">
                <For each={resources}>
                  {({id, label}) => {
                    const inputId = `resourceSelected_${id}`;
                    const checked = () => selected().has(id);
                    return (
                      <label
                        for={inputId}
                        class={cx("px-1 flex gap-1 items-center hover:bg-hover", {
                          "bg-select hover:bg-select": checked(),
                        })}
                      >
                        <input
                          id={inputId}
                          data-id={id}
                          name="selectedResources"
                          type={props.mode}
                          checked={checked()}
                          onClick={() =>
                            props.setSelection(
                              [...div!.querySelectorAll<HTMLInputElement>("input:checked")]
                                .filter((input) => input.checked)
                                .map((input) => input.dataset.id!),
                            )
                          }
                          onDblClick={() => {
                            if (props.mode === "checkbox") {
                              props.setSelection([id]);
                            }
                          }}
                        />
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
