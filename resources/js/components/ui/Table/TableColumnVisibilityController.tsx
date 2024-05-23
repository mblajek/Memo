import {cx, useLangFunc} from "components/utils";
import {For, Show, VoidComponent, createMemo, createSignal} from "solid-js";
import {ColumnName, useTable} from ".";
import {Button} from "../Button";
import {PopOver} from "../PopOver";
import {title} from "../title";

const _DIRECTIVES = null && title;

export const TableColumnVisibilityController: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const defaultColumnVisibility = table.options.meta?.defaultColumnVisibility;
  const isDefaultVisibility = () =>
    table.getAllLeafColumns().every((c) => c.getIsVisible() === (defaultColumnVisibility?.()[c.id] ?? true));
  const columnStatuses = createMemo(() => {
    const columnGroups = table.options.meta?.tquery?.columnGroups?.();
    const activeGroups = table.options.meta?.tquery?.effectiveActiveColumnGroups?.();
    if (!columnGroups?.length || !activeGroups?.length) {
      return undefined;
    }
    const forceShow = new Set<string>();
    for (const {name, forceShowColumns} of columnGroups) {
      if (activeGroups.includes(name)) {
        for (const col of forceShowColumns) {
          forceShow.add(col);
        }
      }
    }
    // TODO: Consider marking columns that have multiple values.
    return {forceShow};
  });
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
            {(column) => {
              const forceShown = () => columnStatuses()?.forceShow.has(column.id);
              return (
                <Show when={column.getCanHide()}>
                  <label
                    class={cx("px-2 pt-0.5 hover:bg-hover flex gap-1 items-baseline select-none", {
                      "!bg-select": resetHovered() ? defaultColumnVisibility?.()[column.id] : column.getIsVisible(),
                    })}
                    use:title={forceShown() ? t("tables.column_groups.column_status.force_shown") : undefined}
                  >
                    <input
                      name={`column_visibility_${column.id}`}
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      type="checkbox"
                      disabled={forceShown()}
                    />{" "}
                    <ColumnName def={column.columnDef} />
                  </label>
                </Show>
              );
            }}
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
