import {LangEntryFunc} from "components/utils";
import {Component, createMemo, on} from "solid-js";
import {tableStyle as ts, useTable} from ".";

interface Props {
  /** Number of rows. Must be specified for backend tables. */
  rowsCount?: number;
  /** Translation entry for the plural summary, taking the number of rows. */
  summaryTranslation: LangEntryFunc;
}

export const TableSummary: Component<Props> = (props) => {
  const table = useTable();
  const rowsCount = createMemo(
    on(
      [() => props.rowsCount, () => table.getRowModel().rows.length],
      ([propsRowsCount, tableRowsCount]) => propsRowsCount ?? tableRowsCount,
    ),
  );
  return <div class={ts.tableSummary}>{props.summaryTranslation({count: rowsCount()})}</div>;
};
