import {HeaderContext, Row, Table} from "@tanstack/solid-table";

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
    return {
      column,
      headerContext: {
        table,
        column,
        get header() {
          return table.getLeafHeaders().find((h) => h.id === column.id)!;
        },
      } satisfies HeaderContext<T, unknown>,
      cellContext: (row: Row<T>) => row.getAllCells()[i]!.getContext(),
    };
  });
}
