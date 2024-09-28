import {Column, RowData, Table} from "@tanstack/solid-table";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {Button} from "components/ui/Button";
import {Capitalize, capitalizeString} from "components/ui/Capitalize";
import {InfoIcon} from "components/ui/InfoIcon";
import {Modal} from "components/ui/Modal";
import {PopOver} from "components/ui/PopOver";
import {ProgressBar} from "components/ui/ProgressBar";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {CHECKBOX} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {WriteCSVOptions, writeCSV} from "components/utils/csv_writer";
import {isDEV} from "components/utils/dev_mode";
import {pickSaveFile} from "components/utils/files";
import {toastError, toastSuccess} from "components/utils/toast";
import {DateTime} from "luxon";
import {AiOutlineFileExcel} from "solid-icons/ai";
import {Show, VoidComponent, createMemo, createSignal} from "solid-js";
import {CellsPreviewMode} from "./TQueryTable";
import {useTable} from "./TableContext";
import {useTableTextExportCells} from "./table_export_cells";

interface ExportProgress {
  readonly index: number;
  readonly len?: number;
}

type PersistentState = {
  readonly format: string;
};

interface TableExportData {
  readonly table: Table<RowData>;
  readonly columns: readonly Column<RowData, unknown>[];
  readonly numRows?: number;
  readonly rows: () => Iterable<RowData> | AsyncIterable<RowData>;
}

interface ExportFormat {
  readonly id: string;
  readonly label: string;
  export(params: ExportParams): Promise<"ok" | "cancelled">;
}

interface ExportParams {
  readonly saveFilePickerOptions: Partial<SaveFilePickerOptions>;
  readonly exportData: TableExportData;
  readonly onProgress?: (progress: ExportProgress) => void;
  readonly abort?: () => boolean;
}

const PREVIEW_MODE: CellsPreviewMode = "textExport";

export const TableExportButton: VoidComponent = () => {
  const t = useLangFunc();
  const table = useTable();
  const tableExportCells = useTableTextExportCells();

  function createCSVExportFormat(
    id: string,
    {
      extension = ".csv",
      defSaveFilePickerOptions,
      writeCSVOptions,
    }: {
      extension?: `.${string}`;
      defSaveFilePickerOptions?: SaveFilePickerOptions;
      writeCSVOptions?: WriteCSVOptions;
    } = {},
  ) {
    const label = t(`tables.export.format.${id}`);
    return {
      id,
      label,
      async export({saveFilePickerOptions, exportData: {columns, numRows, rows}, onProgress, abort}) {
        const options: SaveFilePickerOptions = {
          suggestedName: "table",
          id: `export_${id}`,
          types: [{description: label, accept: {"text/csv": [extension]}}],
          ...defSaveFilePickerOptions,
          ...saveFilePickerOptions,
        };
        options.suggestedName = `${options.suggestedName}${extension}`;
        const writer = await pickSaveFile(options);
        if (writer === "cancelled") {
          return "cancelled";
        }
        async function* data() {
          onProgress?.({index: 0, len: numRows});
          const cols = columns.map((col) => ({
            col,
            exportCell: col.columnDef.meta?.tquery?.textExportCell || tableExportCells.default(),
          }));
          yield cols.map(({col: {id}}) => {
            const name = table.options.meta?.translations?.columnName(id);
            return name ? capitalizeString(name) : id;
          });
          let rowIndex = 0;
          for await (const row of rows()) {
            yield cols.map(({col, exportCell}) => {
              const value = col.accessorFn!(row, rowIndex);
              return exportCell({value, row, column: col});
            });
            rowIndex++;
            onProgress?.({index: rowIndex, len: numRows});
            if (abort?.()) {
              throw new Error("aborted");
            }
          }
        }
        await writeCSV({writer, data: data(), ...writeCSVOptions});
        return "ok";
      },
    } satisfies ExportFormat;
  }

  const FORMATS: readonly ExportFormat[] = [
    createCSVExportFormat("csv"),
    createCSVExportFormat("excel_csv", {extension: ".excel.csv", writeCSVOptions: {excelMode: true}}),
  ];

  const [progress, setProgress] = createSignal<ExportProgress>();
  const [abort, setAbort] = createSignal(false);

  async function exportRows(exportData: TableExportData) {
    const tableName = (
      table.options.meta?.exportConfig?.tableName ||
      table.options.meta?.translations?.tableName() ||
      "table"
    ).replaceAll(/\s/g, " ");
    const fileName = `${tableName}__${DateTime.now().toFormat("yyyy-MM-dd_HHmm")}`;
    const format = FORMATS.find((f) => f.id === formatId())!;
    setAbort(false);
    try {
      const result = await format.export({
        saveFilePickerOptions: {suggestedName: fileName},
        exportData,
        onProgress: setProgress,
        abort,
      });
      if (result === "ok") {
        toastSuccess(t("tables.export.success"));
      }
    } catch (e) {
      console.error("CSV export error:", e);
      toastError(t(abort() ? "tables.export.aborted" : "tables.export.error"));
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

  const [formatId, setFormatId] = createSignal(FORMATS[0]!.id);
  createPersistence<PersistentState>({
    storage: localStorageStorage("Table:export"),
    value: () => ({format: formatId()}),
    onLoad: (value) => setFormatId((FORMATS.find((m) => m.id === value.format) || FORMATS[0]!).id),
    version: [1],
  });

  return (
    <>
      <PopOver
        trigger={(popOver) => (
          <Button onClick={popOver.open} class="secondary small text-nowrap">
            <AiOutlineFileExcel class="inlineIcon" /> {t("tables.export.label")}
          </Button>
        )}
      >
        {(popOver) => {
          const ItemLabel: VoidComponent<{readonly labelKey: string; readonly count?: number}> = (props) => (
            <span>
              <Capitalize text={t(`tables.export.${props.labelKey}`)} />
              <Show when={props.count}>
                {(count) => (
                  <span class="text-grey-text"> {t("parenthesised", {text: t("tables.rows", {count: count()})})}</span>
                )}
              </Show>
            </span>
          );
          return (
            <div class="flex flex-col">
              <div class="p-1 flex items-center justify-between">
                <SegmentedControl
                  name="export_mode"
                  value={formatId()}
                  onValueChange={setFormatId}
                  items={FORMATS.map(({id, label}) => ({value: id, label: () => label}))}
                  small
                />
                <div class="px-1">
                  <InfoIcon href="/help/table-export" />
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
                    <ItemLabel labelKey="all_pages" count={allRowsExportData()!.numRows} />
                  </Button>
                </Show>
                <Button
                  onClick={() => {
                    popOver.close();
                    exportRows(currentPageExportData());
                  }}
                >
                  <ItemLabel
                    labelKey={currentPageHasAllData() ? "all_pages" : "current_page"}
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
      <Modal title={t("tables.export.exporting")} open={progress()}>
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
