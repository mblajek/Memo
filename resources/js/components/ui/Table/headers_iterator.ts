import {Table} from "@tanstack/solid-table";
import {createMemo} from "solid-js";

/**
 * Returns an array of headers and columns of a table.
 *
 * In each array element, the column is an object and the header is an accessor, returning
 * undefined when the column is not visible.
 *
 * The identity of the returned elements never change, so the headers are not recreated whenever
 * any column visibility changes, which is the case when iterating over headers directly
 * (e.g. using `table.getLeafHeaders()`).
 *
 * Usage:
 *
 *     <For each={getHeaders(table)}>
 *       {({header, column}) => <Show when={header()}>
 *         ...
 *       </Show>}
 *     </For>
 */
export function getHeaders<T>(table: Table<T>) {
  return table.getAllLeafColumns().map((column) => {
    const header = createMemo(() => table.getLeafHeaders().find((h) => h.id === column.id));
    return {header, column};
  });
}
