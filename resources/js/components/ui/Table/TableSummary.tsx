import {useLangFunc} from "components/utils";
import {Show, VoidComponent} from "solid-js";
import {tableStyle as ts, useTable} from ".";

interface Props {
  /**
   * Number of rows. Must be specified for backend tables where it cannot be taken from the
   * table object.
   */
  rowsCount?: number;
}

export const TableSummary: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const count = () => props.rowsCount ?? table.getRowModel().rows.length;
  return (
    <div class={ts.tableSummary}>
      <Show
        when={table.options.meta?.translations?.summary?.({count: count(), defaultValue: ""})}
        fallback={t("tables.tables.generic.summary", {count: count()})}
      >
        {(summary) => <>{summary()}</>}
      </Show>
    </div>
  );
};
