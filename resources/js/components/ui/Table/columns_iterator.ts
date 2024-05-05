import {HeaderContext, Row, Table} from "@tanstack/solid-table";
import {createMemo} from "solid-js";

/**
 * Returns an array of columns of a table, with functions for returning header and row cell.
 *
 * In each array element, the column is an object, and the header and cell is an accessor, returning
 * undefined when the column is not visible.
 *
 * The identity of the returned elements never change, so the headers are not recreated whenever
 * any column visibility changes, which is the case when iterating over headers directly
 * (e.g. using `table.getLeafHeaders()` or `row.getVisibleCells()`).
 */
export function getColumns<T>(table: Table<T>) {
  return table.getAllLeafColumns().map((column, i) => {
    const header = createMemo(() => table.getLeafHeaders().find((h) => h.id === column.id));
    // Keep the identity of this object stable.
    const headerContext = {
      table,
      column,
      get header() {
        return header()!;
      },
    } satisfies HeaderContext<T, unknown>;
    return {
      column,
      getHeaderContext: () => header() && headerContext,
      getCellContext: (row: Row<T>) => row.getAllCells()[i]!.getContext(),
    };
  });
}
