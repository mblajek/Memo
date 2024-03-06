import {cx, useLangFunc} from "components/utils";
import {For, Show, VoidComponent, createSignal} from "solid-js";
import {ColumnName, useTable} from ".";
import {Button} from "../Button";
import {PopOver} from "../PopOver";

export const TableColumnVisibilityController: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const defaultColumnVisibility = table.options.meta?.defaultColumnVisibility;
  const isDefaultVisibility = () =>
    table.getAllLeafColumns().every((c) => c.getIsVisible() === (defaultColumnVisibility?.()[c.id] ?? true));
  const [resetHovered, setResetHovered] = createSignal(false);
  return (
    <PopOver
      trigger={(triggerProps) => (
        <Button
          {...triggerProps()}
          class="rounded px-2 border border-input-border pressedWithShadow"
          disabled={!table.getAllLeafColumns().length}
        >
          {t("tables.choose_columns")}
        </Button>
      )}
    >
      <div class="overflow-y-auto flex flex-col gap-0.5">
        <div class="flex flex-col">
          <For each={table.getAllLeafColumns()}>
            {(column) => (
              <Show when={column.getCanHide()}>
                <label
                  class={cx("px-2 pt-0.5 hover:bg-hover flex gap-1 items-baseline select-none", {
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
      </div>
      <div class="p-1 flex flex-col gap-1">
        <Show when={defaultColumnVisibility}>
          {(defaultColumnVisibility) => (
            <Button
              class="secondary small"
              onClick={() => table.setColumnVisibility(defaultColumnVisibility())}
              disabled={isDefaultVisibility()}
              onMouseOver={[setResetHovered, true]}
              onMouseOut={[setResetHovered, false]}
            >
              {t("actions.restore_default")}
            </Button>
          )}
        </Show>
        <Button
          class="secondary small"
          onClick={() => table.setColumnSizing({})}
          disabled={!Object.keys(table.getState().columnSizing).length}
        >
          {t("tables.reset_column_sizes")}
        </Button>
      </div>
    </PopOver>
  );
};
