import {useTable} from "components/ui/Table/TableContext";
import {useLangFunc} from "components/utils/lang";
import {Show, VoidComponent} from "solid-js";

interface Props {
  /**
   * Number of rows. Must be specified for backend tables where it cannot be taken from the
   * table object.
   */
  readonly rowsCount?: number;
}

export const TableSummary: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const count = () => props.rowsCount ?? table.getCoreRowModel().rows.length;
  return (
    <div class="flex items-center text-nowrap">
      <Show
        when={table.options.meta?.translations?.summary?.(
          count(),
          table.options.meta.tquery?.effectiveActiveColumnGroups?.(),
          {defaultValue: ""},
        )}
        fallback={t("tables.tables.generic.summary", {count: count()})}
      >
        {(summary) => <>{summary()}</>}
      </Show>
    </div>
  );
};
