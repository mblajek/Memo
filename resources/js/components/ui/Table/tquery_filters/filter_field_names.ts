import {useTable} from "../TableContext";

export function useFilterFieldNames() {
  const table = useTable();
  const tableId = () => table.options.meta?.tableId;
  return {
    get: (suffix: string) => `table${tableId() ? `-${tableId()}` : ""}.filter.${suffix}`,
  };
}
