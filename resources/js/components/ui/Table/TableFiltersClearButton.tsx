import {cx, useLangFunc} from "components/utils";
import {For, VoidComponent} from "solid-js";
import {FilterIconButton} from "./FilterIconButton";
import {useTable} from "./TableContext";

interface Props {
  readonly columnsWithActiveFilters: readonly string[];
  readonly clearColumnFilters: () => void;
}

export const TableFiltersClearButton: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  return (
    <FilterIconButton
      class={cx(
        "border border-input-border rounded px-1",
        props.columnsWithActiveFilters.length ? "border-memo-active" : undefined,
      )}
      isFiltering={props.columnsWithActiveFilters.length > 0}
      onClear={props.clearColumnFilters}
      title={
        props.columnsWithActiveFilters.length ? (
          <>
            <p>{t("tables.filter.column_filters_set")}</p>
            <ul class="list-disc list-inside">
              <For each={props.columnsWithActiveFilters}>
                {(column) => <li>{table.options.meta?.translations?.columnName(column)}</li>}
              </For>
            </ul>
            <p>{t("tables.filter.click_to_clear")}</p>
          </>
        ) : (
          t("tables.filter.column_filters_cleared")
        )
      }
    />
  );
};
