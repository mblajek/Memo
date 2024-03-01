import {ColumnDef} from "@tanstack/solid-table";
import {DATE_FORMAT, DATE_TIME_FORMAT, useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {DateTime} from "luxon";
import {RowDataType} from "./table_cells";

/** The function calculating the textual cell value in table export.*/
export type ExportCellFunc<R, T = RowDataType> = (ctx: ExportCellContext<T>) => R;

export interface ExportCellContext<TData> {
  readonly value: unknown;
  readonly row: TData;
  readonly column: ColumnDef<TData, unknown>;
}

export type TextExportedCell = string | undefined;

/** Returns a collection of export cell functions for various data types, for exporting into textual format. */
export function useTableTextExportCells() {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const def =
    <T>() =>
    (ctx: ExportCellContext<T>) =>
      defaultFormatTextExportValue(ctx.value);
  return {
    default: def,
    bool: <T>() => exportCellFunc<TextExportedCell, boolean, T>((v) => t(v ? "bool_values.yes" : "bool_values.no")),
    date: <T>() => exportCellFunc<TextExportedCell, string, T>((v) => DateTime.fromISO(v).toLocaleString(DATE_FORMAT)),
    datetime: <T>() =>
      exportCellFunc<TextExportedCell, string, T>((v) => formatDateTimeForTextExport(DateTime.fromISO(v))),
    int: def,
    list: def,
    object: def,
    uuid: def,
    uuidList: def,
    dict: <T>() => exportCellFunc<TextExportedCell, string, T>((v) => dictionaries()?.getPositionById(v).label),
    dictList: <T>() =>
      exportCellFunc<TextExportedCell, string[], T>((v) =>
        v.map((w) => dictionaries()?.getPositionById(w).label).join(","),
      ),
  };
}

export function formatDateTimeForTextExport(dateTime: DateTime) {
  return dateTime.toLocal().toLocaleString(DATE_TIME_FORMAT);
}

/**
 * Helper for creating a text exporter.
 *
 * Generic types:
 *   - R - the result of the export function (e.g. TextExportedCell for a text exporter).
 *   - V - the type of the cell value (row field) being exported.
 *   - T - the type of the row data.
 */
export function exportCellFunc<R, V, T = RowDataType>(
  func: (v: V, ctx: ExportCellContext<T>) => R,
  fallback: () => R,
): ExportCellFunc<R, T>;
/**
 * Helper for creating a text exporter.
 *
 * Generic types:
 *   - R - the result of the export function (e.g. TextExportedCell for a text exporter).
 *   - V - the type of the cell value (row field) being exported.
 *   - T - the type of the row data.
 */
export function exportCellFunc<R, V, T = RowDataType>(
  func: (v: V, ctx: ExportCellContext<T>) => R,
): ExportCellFunc<R | undefined, T>;
export function exportCellFunc<R, V, T = RowDataType>(
  func: (v: V, ctx: ExportCellContext<T>) => R,
  fallback?: () => R,
): ExportCellFunc<R | undefined, T> {
  return (ctx) => (ctx.value == undefined ? fallback?.() : func(ctx.value as V, ctx));
}

function defaultFormatTextExportValue(value: unknown): string | undefined {
  if (value == undefined) {
    return undefined;
  } else if (Array.isArray(value)) {
    return value.map(defaultFormatTextExportValue).join(", ");
  } else if (typeof value === "object") {
    return `{${Object.entries(value)
      .map(([k, v]) => `${k}: ${defaultFormatTextExportValue(v)}`)
      .join(", ")}}`;
  } else {
    return String(value);
  }
}
