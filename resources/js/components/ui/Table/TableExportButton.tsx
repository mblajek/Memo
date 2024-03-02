import {RowData} from "@tanstack/solid-table";
import {useLangFunc} from "components/utils";
import {exportCSV} from "components/utils/csv_exporter";
import {DateTime} from "luxon";
import {AiOutlineFileExcel} from "solid-icons/ai";
import {VoidComponent, createSignal} from "solid-js";
import toast from "solid-toast";
import {Button} from "../Button";
import {Modal} from "../Modal";
import {PopOver} from "../PopOver";
import {ProgressBar} from "../ProgressBar";
import {SimpleMenu} from "../SimpleMenu";
import {AllRowsExportIterable} from "./TQueryTable";
import {useTable} from "./TableContext";
import {useTableTextExportCells} from "./table_export_cells";

interface ExportProgress {
  readonly index?: number;
  readonly len?: number;
}

export const TableExportButton: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const tableExportCells = useTableTextExportCells();

  const [exportProgress, setExportProgress] = createSignal<ExportProgress>();
  const [abort, setAbort] = createSignal(false);

  async function exportRows(rows: unknown[] | AllRowsExportIterable<RowData>) {
    const tableName =
      table.options.meta?.exportConfig?.tableName || table.options.meta?.translations?.tableName() || "table";
    const fileName = `${tableName}__${DateTime.now().toFormat("yyyy-MM-dd_HHmm")}`;
    async function* data() {
      setExportProgress({len: rows.length});
      setAbort(false);
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
        setExportProgress({index: rowIndex, len: rows.length});
        if (abort()) {
          throw "aborted";
        }
      }
    }
    try {
      const {result} = await exportCSV({
        fileName,
        data: data(),
        excelMode: true,
      });
      if (result === "done") {
        toast.success(t("tables.export.success"));
      }
    } catch (e) {
      console.error("CSV export error:", e);
      toast.error(t(e === "aborted" ? "tables.export.aborted" : "tables.export.error"));
    } finally {
      setExportProgress(undefined);
    }
  }

  function getCurrentPageRows() {
    return table.getRowModel().rows.map((row) => row.original);
  }

  const allRowsExportIterable = () => table.options.meta?.tquery?.allRowsExportIterable;

  return (
    <>
      <PopOver
        trigger={(triggerProps) => (
          <Button {...triggerProps()} class="secondary small">
            <AiOutlineFileExcel class="inlineIcon text-current" /> {t("tables.export.label")}
          </Button>
        )}
      >
        {(popOver) => {
          const ItemLabel: VoidComponent<{labelKey: string; type: string}> = (props) => (
            <div class="flex gap-2 justify-between">
              {t(`tables.export.${props.labelKey}`)}
              <span class="text-grey-text">{t("parenthesised", {text: props.type})}</span>
            </div>
          );
          return (
            <SimpleMenu>
              <Button
                onClick={() => {
                  popOver().close();
                  exportRows(getCurrentPageRows());
                }}
              >
                <ItemLabel labelKey="current_page" type="Excel CSV" />
              </Button>
              <Button
                onClick={() => {
                  popOver().close();
                  exportRows(allRowsExportIterable()!);
                }}
                disabled={!allRowsExportIterable()}
              >
                <ItemLabel labelKey="all_pages" type="Excel CSV" />
              </Button>
            </SimpleMenu>
          );
        }}
      </PopOver>
      <Modal title={t("tables.export.exporting")} open={exportProgress()}>
        {(progress) => (
          <div class="flex flex-col gap-2">
            <ProgressBar value={progress().len === undefined ? undefined : progress().index} max={progress().len} />
            <Button class="self-end secondary small" onClick={[setAbort, true]}>
              {t("actions.cancel")}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};
