import {useLangFunc} from "components/utils";
import {VoidComponent} from "solid-js";
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
      class="border border-input-border rounded px-1"
      isFiltering={props.columnsWithActiveFilters.length > 0}
      onClear={props.clearColumnFilters}
      title={
        props.columnsWithActiveFilters.length
          ? `${t("tables.filter.column_filters_set")}\n${props.columnsWithActiveFilters
              .map((column) => `- ${table.options.meta?.translations?.columnNames(column)}`)
              .join("\n")}\n${t("tables.filter.click_to_clear")}`
          : t("tables.filter.column_filters_cleared")
      }
    />
  );
};
