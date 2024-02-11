import {useLangFunc} from "components/utils";
import {PossiblyAsyncIterable} from "components/utils/async";
import {exportCSV} from "components/utils/csv_exporter";
import {DateTime} from "luxon";
import {AiOutlineFileExcel} from "solid-icons/ai";
import {VoidComponent} from "solid-js";
import toast from "solid-toast";
import {Button} from "../Button";
import {PopOver} from "../PopOver";
import {SimpleMenu} from "../SimpleMenu";
import {useTable} from "./TableContext";
import {useTableTextExportCells} from "./table_export_cells";

export const TableExportButton: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const tableExportCells = useTableTextExportCells();

  async function exportRows(rows: PossiblyAsyncIterable<unknown>) {
    const tableName =
      table.options.meta?.exportConfig?.tableName || table.options.meta?.translations?.tableName() || "table";
    const fileName = `${tableName}__${DateTime.now().toFormat("yyyy-MM-dd_HHmm")}`;
    async function* data() {
      const cols = table
        .getVisibleLeafColumns()
        .filter((col) => col.accessorFn)
        .map((col) => ({col, exportCell: col.columnDef.meta?.tquery?.textExportCell || tableExportCells.default()}));
      yield cols.map(({col: {id}}) => table.options.meta?.translations?.columnName(id) || id);
      let rowIndex = 0;
      for await (const row of rows) {
        yield cols.map(({col, exportCell}) => {
          const value = col.accessorFn!(row, rowIndex);
          return exportCell({value, row, column: col});
        });
        rowIndex++;
      }
    }
    try {
      const {result} = await exportCSV({
        fileName,
        data: data(),
      });
      if (result === "done") {
        toast.success(t("tables.export.success"));
      }
    } catch (e) {
      console.error("CSV export error:", e);
      toast.error(t("tables.export.error"));
    }
  }

  function getCurrentPageRows() {
    return table.getRowModel().rows.map((row) => row.original);
  }

  return (
    <PopOver
      trigger={(triggerProps) => (
        <Button {...triggerProps()} class="secondary small">
          <AiOutlineFileExcel class="inlineIcon text-current" /> {t("tables.export.label")}
        </Button>
      )}
    >
      {(popOver) => {
        async function exportAndCloseMenu(rows: PossiblyAsyncIterable<unknown>) {
          await exportRows(rows);
          popOver().close();
        }
        const ItemLabel: VoidComponent<{labelKey: string; type: string}> = (props) => (
          <div class="flex gap-2 justify-between">
            {t(`tables.export.${props.labelKey}`)}
            <span class="text-grey-text">{t("parenthesised", {text: props.type})}</span>
          </div>
        );

        return (
          <SimpleMenu>
            <Button onClick={[exportAndCloseMenu, getCurrentPageRows()]}>
              <ItemLabel labelKey="current_page" type="CSV" />
            </Button>
            <Button disabled title="Funkcja jeszcze niedostępna">
              <ItemLabel labelKey="all_pages" type="CSV" />
            </Button>
          </SimpleMenu>
        );
      }}
    </PopOver>
  );
};
