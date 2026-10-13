import {useTable} from "../TableContext";

export function useFilterFieldNames() {
  const table = useTable();
  const tableId = () => table.options.meta?.tableId;
  return {
    get: (part: string, columnName: string) =>
      `table${tableId() ? `__${tableId()}` : ""}__filter__${part}__${columnName}`,
  };
}
