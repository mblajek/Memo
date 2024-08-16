import {VisibilityState} from "@tanstack/solid-table";
import {cx, debouncedAccessor, useLangFunc} from "components/utils";
import {For, Show, VoidComponent, createComputed, createSignal} from "solid-js";
import {ColumnName, useTable} from ".";
import {Button} from "../Button";
import {PopOver} from "../PopOver";
import {title} from "../title";

const _DIRECTIVES = null && title;

export const TableColumnVisibilityController: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const defaultColumnVisibility = table.options.meta?.defaultColumnVisibility;
  const columnGroupingInfo = table.options.meta?.tquery?.columnGroupingInfo;
  const [visibility, setVisibility] = createSignal<Readonly<VisibilityState>>();
  const isDefaultVisibility = () => {
    const vis = visibility();
    return (
      !!vis &&
      Object.entries(vis).every(
        ([id, visible]) => columnGroupingInfo?.(id).isCount || visible === (defaultColumnVisibility?.()[id] ?? true),
      )
    );
  };
  // eslint-disable-next-line solid/reactivity
  const debouncedVisibility = debouncedAccessor(visibility, {outputImmediately: () => isDefaultVisibility()});
  createComputed(() => {
    const vis = debouncedVisibility();
    if (vis) {
      table.setColumnVisibility(vis);
    }
  });
  const [resetHovered, setResetHovered] = createSignal(false);

  const Content: VoidComponent = () => {
    const currentVisibility: VisibilityState = {};
    for (const column of table.getAllLeafColumns()) {
      currentVisibility[column.id] = column.getIsVisible();
    }
    setVisibility(currentVisibility);
    return (
      <>
        <div class="overflow-y-auto flex flex-col gap-0.5">
          <div class="flex flex-col">
            <For each={table.getAllLeafColumns()}>
              {(column) => {
                const groupingInfo = () => columnGroupingInfo?.(column.id);
                return (
                  <Show when={groupingInfo() && !groupingInfo()?.isCount}>
                    <label
                      class={cx("px-2 pt-0.5 hover:bg-hover flex gap-1 items-baseline select-none", {
                        "!bg-select": resetHovered()
                          ? defaultColumnVisibility?.()[column.id]
                          : visibility()?.[column.id],
                      })}
                    >
                      <input
                        class={column.getCanHide() ? undefined : "invisible"}
                        name={`column_visibility_${column.id}`}
                        checked={visibility()?.[column.id]}
                        onChange={({target}) => setVisibility((v) => ({...v, [column.id]: target.checked}))}
                        type="checkbox"
                        disabled={!column.getCanHide() || groupingInfo()?.isForceShown}
                        use:title={
                          groupingInfo()?.isForceShown ? t("tables.column_groups.column_status.force_shown") : undefined
                        }
                      />{" "}
                      <ColumnName def={column.columnDef} />
                      <Show when={groupingInfo()?.isGrouped}>
                        <span class="text-memo-active" use:title={t("tables.column_groups.column_status.grouped")}>
                          {t("tables.column_groups.grouping_symbol")}
                        </span>
                      </Show>
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
                onClick={() => setVisibility(defaultColumnVisibility())}
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
      </>
    );
  };

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
      <Content />
    </PopOver>
  );
};
