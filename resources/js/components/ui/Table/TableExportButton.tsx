import {Column, RowData, Table} from "@tanstack/solid-table";
import {Button} from "components/ui/Button";
import {useCSVExportModeSelector} from "components/ui/CSVExportModeSelector";
import {CSVExportSupportWarning} from "components/ui/CSVExportSupportWarning";
import {Capitalize, capitalizeString} from "components/ui/Capitalize";
import {Modal} from "components/ui/Modal";
import {PopOver} from "components/ui/PopOver";
import {ProgressBar} from "components/ui/ProgressBar";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {actionIcons} from "components/ui/icons";
import {CHECKBOX} from "components/ui/symbols";
import {writeCSV} from "components/utils/csv_writer";
import {isDEV} from "components/utils/dev_mode";
import {pickSaveFile} from "components/utils/files";
import {useLangFunc} from "components/utils/lang";
import {toastError, toastSuccess} from "components/utils/toast";
import {DateTime} from "luxon";
import {Show, VoidComponent, createMemo, createSignal} from "solid-js";
import {useDocsModalInfoIcon} from "../docs_modal";
import {CellsPreviewMode} from "./TQueryTable";
import {useTable} from "./TableContext";
import {useTableTextExportCells} from "./table_export_cells";

interface ExportProgress {
  readonly index: number;
  readonly len?: number;
}

interface TableExportData {
  readonly table: Table<RowData>;
  readonly columns: readonly Column<RowData, unknown>[];
  readonly numRows?: number;
  readonly rows: () => Iterable<RowData> | AsyncIterable<RowData>;
}

const PREVIEW_MODE: CellsPreviewMode = "textExport";

export const TableExportButton: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const tableExportCells = useTableTextExportCells();
  const {DocsModalInfoIcon} = useDocsModalInfoIcon();
  const {CSVExportModeSelector, csvMode} = useCSVExportModeSelector({persistenceKey: "Table:export"});
  const [progress, setProgress] = createSignal<ExportProgress>();
  const [abort, setAbort] = createSignal(false);

  async function exportRows(exportData: TableExportData) {
    const mode = csvMode();
    if (!mode) {
      throw new Error(`No mode selected`);
    }
    const tableName = (
      table.options.meta?.exportConfig?.tableName ||
      table.options.meta?.translations?.tableName() ||
      "table"
    ).replaceAll(/\s/g, " ");
    const options: SaveFilePickerOptions = {
      suggestedName: `${tableName}__${DateTime.now().toFormat("yyyy-MM-dd_HHmm")}${mode.extension}`,
      id: `table_export_${mode.id}`,
      types: mode.pickerTypes,
    };
    setAbort(false);
    try {
      const writer = await pickSaveFile(options);
      if (writer === "cancelled") {
        return;
      }
      async function* data() {
        setProgress({index: 0, len: exportData.numRows});
        const cols = exportData.columns.map((col) => ({
          col,
          exportCell: col.columnDef.meta?.tquery?.textExportCell || tableExportCells.default(),
        }));
        yield cols.map(({col: {id}}) => {
          const name = table.options.meta?.translations?.columnName(id);
          return name ? capitalizeString(name) : id;
        });
        let rowIndex = 0;
        for await (const row of exportData.rows()) {
          yield cols.map(({col, exportCell}) => {
            const value = col.accessorFn!(row, rowIndex);
            return exportCell({value, row, column: col});
          });
          rowIndex++;
          setProgress({index: rowIndex, len: exportData.numRows});
          if (abort?.()) {
            throw new Error("aborted");
          }
        }
      }
      await writeCSV({writer, data: data(), ...mode.writeCSVOptions});
      toastSuccess(t("csv_export.success"));
    } catch (e) {
      console.error("CSV export error:", e);
      toastError(t(abort() ? "csv_export.aborted" : "csv_export.error"));
      return;
    } finally {
      setProgress(undefined);
    }
  }

  const columns = createMemo(() => table.getVisibleLeafColumns().filter((col) => col.accessorFn));
  const allRowsExportData = createMemo(() => {
    const allRows = table.options.meta?.tquery?.allRowsExportIterable;
    if (!allRows) {
      return undefined;
    }
    return {
      table,
      columns: columns(),
      numRows: allRows.length,
      rows: () => allRows,
    } satisfies TableExportData;
  });
  const currentPageExportData = createMemo(
    () =>
      ({
        table,
        columns: columns(),
        numRows: table.getRowModel().rows.length,
        rows: () => table.getRowModel().rows.map((row) => row.original),
      }) satisfies TableExportData,
  );
  /** Whether the current page export would for sure export the same data as the all rows export. */
  const currentPageHasAllData = () => allRowsExportData()?.numRows === currentPageExportData().numRows;

  return (
    <>
      <PopOver
        trigger={(popOver) => (
          <Button onClick={popOver.open} class="secondary small text-nowrap">
            <actionIcons.ExportCSV class="inlineIcon" /> {t("csv_export.label")}
          </Button>
        )}
      >
        {(popOver) => {
          const ItemLabel: VoidComponent<{readonly pages: "all" | "current"; readonly count?: number}> = (props) => (
            <span>
              <Capitalize text={t(props.pages === "all" ? "tables.export.all_pages" : "tables.export.current_page")} />
              <Show when={props.count}>
                {(count) => (
                  <span class="text-grey-text"> {t("parenthesised", {text: t("tables.rows", {count: count()})})}</span>
                )}
              </Show>
            </span>
          );
          return (
            <div class="flex flex-col">
              <CSVExportSupportWarning class="p-1" />
              <div class="p-1 flex items-center">
                <CSVExportModeSelector />
                <div class="px-1">
                  <DocsModalInfoIcon href="/help/table-export" onClick={popOver.close} />
                </div>
              </div>
              <SimpleMenu>
                <Show when={allRowsExportData() && !currentPageHasAllData()}>
                  <Button
                    onClick={() => {
                      popOver.close();
                      exportRows(allRowsExportData()!);
                    }}
                  >
                    <ItemLabel pages="all" count={allRowsExportData()!.numRows} />
                  </Button>
                </Show>
                <Button
                  onClick={() => {
                    popOver.close();
                    exportRows(currentPageExportData());
                  }}
                >
                  <ItemLabel
                    pages={currentPageHasAllData() ? "all" : "current"}
                    count={currentPageExportData().numRows}
                  />
                </Button>
                <Show when={isDEV() && table.options.meta?.tquery?.cellsPreviewMode}>
                  {(cellsPreviewMode) => (
                    <Button
                      onClick={() =>
                        cellsPreviewMode()[1]((mode) => (mode === PREVIEW_MODE ? undefined : PREVIEW_MODE))
                      }
                    >
                      {CHECKBOX(cellsPreviewMode()[0]() === PREVIEW_MODE)} <span class="text-xs">DEV</span> Preview
                    </Button>
                  )}
                </Show>
              </SimpleMenu>
            </div>
          );
        }}
      </PopOver>
      <Modal title={t("csv_export.exporting")} open={progress()}>
        {(progress) => {
          const progressValuePercent = createMemo(() =>
            progress().len ? Math.round((100 * progress().index) / progress().len!) : progress().len,
          );
          return (
            <div class="flex flex-col gap-2">
              <ProgressBar value={progressValuePercent()} max={progress().len && 100} />
              <Button
                class="self-end secondary small"
                onClick={() => {
                  setAbort(true);
                  setProgress(undefined);
                }}
              >
                {t("actions.cancel")}
              </Button>
            </div>
          );
        }}
      </Modal>
    </>
  );
};
