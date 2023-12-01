import * as popover from "@zag-js/popover";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx, useLangFunc} from "components/utils";
import {For, Show, VoidComponent, createMemo, createSignal, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import {ColumnName, useTable} from ".";
import {Button} from "../Button";
import s from "./TableColumnVisibilityController.module.scss";

export const TableColumnVisibilityController: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const [state, send] = useMachine(
    popover.machine({
      portalled: true,
      positioning: {
        offset: {mainAxis: 1},
        strategy: "absolute",
        placement: "bottom-end",
      },
      id: createUniqueId(),
    }),
  );
  const api = createMemo(() => popover.connect(state, send, normalizeProps));
  const defaultColumnVisibility = table.options.meta?.defaultColumnVisibility;
  const [resetHovered, setResetHovered] = createSignal(false);
  return (
    <div class={s.columnVisibility}>
      <Button
        class="pressedWithShadow border-input-border"
        {...api().triggerProps}
        disabled={!table.getAllLeafColumns().length}
      >
        {t("tables.choose_columns")}
      </Button>
      <Portal>
        <div class={s.columnVisibilityPortal} {...api().positionerProps}>
          <div {...api().contentProps}>
            <div class="bg-white border border-gray-700 rounded overflow-clip flex flex-col">
              <div class="flex flex-col">
                <For each={table.getAllLeafColumns()}>
                  {(column) => (
                    <Show when={column.getCanHide()}>
                      <label
                        class={cx("px-2 pt-0.5 hover:bg-hover flex gap-1 items-baseline", {
                          "!bg-select": resetHovered() ? defaultColumnVisibility?.()[column.id] : column.getIsVisible(),
                        })}
                      >
                        <input
                          name={`column_visibility_${column.id}`}
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          type="checkbox"
                        />{" "}
                        <ColumnName def={column.columnDef} />
                      </label>
                    </Show>
                  )}
                </For>
              </div>
              <Show when={defaultColumnVisibility}>
                {(defaultColumnVisibility) => (
                  <Button
                    class="secondarySmall m-1"
                    onClick={() => table.setColumnVisibility(defaultColumnVisibility())}
                    onMouseOver={[setResetHovered, true]}
                    onMouseOut={[setResetHovered, false]}
                  >
                    {t("actions.restore_default")}
                  </Button>
                )}
              </Show>
            </div>
          </div>
        </div>
      </Portal>
    </div>
  );
};
