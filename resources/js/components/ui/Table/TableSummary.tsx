import {LangEntryFunc, useLangFunc} from "components/utils";
import {Show, VoidComponent} from "solid-js";
import {tableStyle as ts, useTable} from ".";

interface Props {
  /**
   * Number of rows. Must be specified for backend tables where it cannot be taken from the
   * table object.
   */
  rowsCount?: number;
  /**
   * Translation entry for the plural summary, taking the number of rows. Defaults to the value from
   * meta.translations in table, and then to a generic default.
   */
  summaryTranslation?: LangEntryFunc;
}

export const TableSummary: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const count = () => props.rowsCount ?? table.getRowModel().rows.length;
  return (
    <div class={ts.tableSummary}>
      <Show
        when={props.summaryTranslation}
        fallback={
          <Show
            when={table.options.meta?.translations?.summary?.({count: count(), defaultValue: ""})}
            fallback={t("tables.tables.generic.summary", {count: count()})}
          >
            {(summary) => <>{summary()}</>}
          </Show>
        }
      >
        {(summaryTranslation) => <>{summaryTranslation()({count: count()})}</>}
      </Show>
    </div>
  );
};
