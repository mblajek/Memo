import {
  ColumnDef,
  PaginationState,
  Row,
  RowData,
  SortingState,
  TableOptions,
  TableState,
  Table as TanStackTable,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/solid-table";
import {LangEntryFunc, LangPrefixFunc, createTranslationsFromPrefix, cx} from "components/utils";
import {Accessor, For, Index, JSX, Show, Signal, createEffect, createSignal, mergeProps, on} from "solid-js";
import {Dynamic} from "solid-js/web";
import {TableContextProvider, getHeaders, tableStyle as ts, useTableCells} from ".";
import {BigSpinner, EMPTY_VALUE_SYMBOL} from "..";
import {CellRenderer} from "./CellRenderer";

export interface TableTranslations {
  tableName: LangEntryFunc;
  /** Entries for the table column names. */
  columnNames: LangPrefixFunc;
  /** Summary of the table, taking the number of rows as count. */
  summary: LangEntryFunc;
}

export function createTableTranslations(tableName: string): TableTranslations {
  return createTranslationsFromPrefix(`tables.tables.${tableName}`, ["tableName", "columnNames", "summary"]);
}

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    /** The translations for the table, used by various table-related components. */
    translations?: TableTranslations;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * The simple representation of the translated column name. If set, overrides the value from
     * table meta translations.
     */
    columnName?: () => JSX.Element;
  }
}

/**
 * Mode in which the table is displayed:
 * - standalone - the table is the main element on the page, typically displays many rows,
 * header and footer are sticky.
 * - embedded - the table is displayed along with other elements in a page, typically with not
 * many rows, without sticky elements.
 */
export type DisplayMode = "standalone" | "embedded";

interface Props<T = object> {
  table: TanStackTable<T>;
  /** Table mode. Default: embedded. */
  mode?: DisplayMode;
  /** Whether the column sizes are taken from the content size. Default: true. */
  autoColumnSize?: boolean;
  /**
   * The iteration component used for iterating over rows. Default: For.
   *
   * The For iteration might be more useful for a frontend table, where the rows is a constant
   * collection of elements. For backend tables, when the rows change identity after each query
   * to the backend, Index might be a better choice.
   */
  rowsIteration?: "For" | "Index";
  /** The content to put above the table, e.g. the global search bar. */
  aboveTable?: () => JSX.Element;
  /**
   * The height of the aboveTable element. It is important to calculate the sticky header position
   * in the standalone mode. Default: 32.
   */
  aboveTableHeight?: number;
  /** The content to put below the table, e.g. the pagination controller. */
  belowTable?: () => JSX.Element;
  /**
   * The height of the belowTable element. It is important to calculate the sticky lower bar position
   * in the standalone mode. Default: 32.
   */
  belowTableHeight?: number;
  /** Whether the whole table content is loading. This hides the whole table and displays a spinner. */
  isLoading?: boolean;
  /** Whether the content of the table is reloading. This dims the table and makes it inert. */
  isDimmed?: boolean;
  /** A signal which changes when the table should scroll itself to the top. */
  scrollToTopSignal?: Accessor<unknown>;
}

const DEFAULT_PROPS = {
  mode: "embedded",
  autoColumnSize: true,
  rowsIteration: "For",
  aboveTableHeight: 32,
  belowTableHeight: 32,
  isLoading: false,
  isDimmed: false,
} satisfies Partial<Props>;

/** A typical list of classes for the aboveTable and belowTable elements. */
export const ABOVE_AND_BELOW_TABLE_DEFAULT_CSS = "h-full flex items-stretch";

/**
 * A table. Most aspects of the table are controlled by props.table, some additional options
 * are controlled via other props.
 *
 * Limitations:
 * - no column groups
 * - no foldable rows
 */
export const Table = <T,>(optProps: Props<T>) => {
  const props = mergeProps(DEFAULT_PROPS, optProps);
  let scrollToTopPoint: HTMLDivElement | undefined;
  createEffect(
    on(
      () => props.scrollToTopSignal?.(),
      () => scrollToTopPoint?.scrollIntoView({behavior: "smooth"}),
    ),
  );
  const gridTemplateColumns = () =>
    props.autoColumnSize
      ? `repeat(${props.table.getVisibleLeafColumns().length}, auto)`
      : props.table
          .getVisibleLeafColumns()
          .map((c) => `${c.getSize()}px`)
          .join(" ");
  return (
    <TableContextProvider table={props.table}>
      <Show when={!props.isLoading} fallback={<BigSpinner />}>
        <div
          ref={scrollToTopPoint}
          class={cx(ts.tableContainer, props.mode === "standalone" ? ts.standalone : ts.embedded)}
        >
          <Show when={props.aboveTable}>
            <div class={ts.aboveTable} style={{height: `${props.aboveTableHeight}px`}}>
              {props.aboveTable?.()}
            </div>
          </Show>
          <div class={ts.tableBg}>
            <div
              class={ts.table}
              classList={{[ts.dimmed!]: props.isDimmed}}
              style={{
                "grid-template-columns": gridTemplateColumns(),
              }}
            >
              <div
                class={ts.headerRow}
                style={{"--aboveTableHeight": `${props.aboveTable ? props.aboveTableHeight : 0}px`}}
              >
                <For each={getHeaders(props.table)}>
                  {({header, column}) => (
                    <Show when={header()}>
                      {(header) => (
                        <div class={ts.cell}>
                          <Show when={!header().isPlaceholder}>
                            <CellRenderer component={column.columnDef.header} props={header().getContext()} />
                          </Show>
                        </div>
                      )}
                    </Show>
                  )}
                </For>
              </div>
              <Dynamic
                component={{For, Index}[props.rowsIteration]}
                each={props.table.getRowModel().rows}
                fallback={
                  <div class={ts.wideRow}>
                    <Show when={props.isDimmed} fallback={EMPTY_VALUE_SYMBOL}>
                      <BigSpinner />
                    </Show>
                  </div>
                }
              >
                {(rowMaybeAccessor: Row<T> | Accessor<Row<T>>) => {
                  const row = typeof rowMaybeAccessor === "function" ? rowMaybeAccessor : () => rowMaybeAccessor;
                  return (
                    <div class={ts.dataRow} inert={props.isDimmed || undefined}>
                      <Index each={row().getVisibleCells()}>
                        {(cell) => (
                          <span class={ts.cell}>
                            <CellRenderer component={cell().column.columnDef.cell} props={cell().getContext()} />
                          </span>
                        )}
                      </Index>
                    </div>
                  );
                }}
              </Dynamic>
              <div
                class={ts.bottomBorder}
                style={{"--belowTableHeight": `${props.belowTable ? props.belowTableHeight : 0}px`}}
              />
            </div>
          </div>
          <Show when={props.belowTable}>
            <div class={ts.belowTable} style={{height: `${props.belowTableHeight}px`}}>
              {props.belowTable?.()}
            </div>
          </Show>
        </div>
      </Show>
    </TableContextProvider>
  );
};

/**
 * Features that the table should support.
 *
 * Each feature can be specified by providing an external signal, or initial value,
 * or just true to use the defaults. Missing key or false disables the feature.
 */
export interface TableFeaturesConfig {
  columnVisibility?: boolean | Signal<VisibilityState> | VisibilityState;
  sorting?: boolean | Signal<SortingState> | SortingState;
  globalFilter?: boolean | Signal<string> | string;
  pagination?: boolean | Signal<PaginationState> | PaginationState;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Returns base options for createSolidTable.
 *
 * The state parameter describes extra properties of the state, apart from those defined by the
 * selected features. The state parameter can have getters defined on it - they are safely moved to the
 * resulting state.
 */
export function getBaseTableOptions<T>({
  features: {columnVisibility, sorting, globalFilter, pagination} = {},
  state = {},
  defaultColumn = {},
}: {
  features?: TableFeaturesConfig;
  state?: Partial<TableState>;
  defaultColumn?: Partial<ColumnDef<T, unknown>>;
} = {}) {
  const tableCells = useTableCells();
  const columnVisibilitySignal = getFeatureSignal(columnVisibility, {});
  const sortingSignal = getFeatureSignal(sorting, []);
  const globalFilterSignal = getFeatureSignal(globalFilter, "");
  const paginationSignal = getFeatureSignal(pagination, {pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE});
  const baseState: Partial<TableState> = {
    get columnVisibility() {
      return columnVisibilitySignal?.[0]();
    },
    get sorting() {
      return sortingSignal?.[0]();
    },
    get globalFilter() {
      return globalFilterSignal?.[0]();
    },
    get pagination() {
      return paginationSignal?.[0]();
    },
  };
  Object.defineProperties(baseState, Object.getOwnPropertyDescriptors(state));
  return {
    maxMultiSortColCount: 2,
    enableSortingRemoval: false,
    columnResizeMode: "onChange",
    defaultColumn: {
      header: tableCells.defaultHeader,
      cell: tableCells.default,
      minSize: 50,
      size: 250,
      ...defaultColumn,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: baseState,
    onColumnVisibilityChange: columnVisibilitySignal?.[1],
    onSortingChange: sortingSignal?.[1],
    onGlobalFilterChange: globalFilterSignal?.[1],
    onPaginationChange: paginationSignal?.[1],
  } satisfies Partial<TableOptions<T>>;
}

function getFeatureSignal<T>(feature: undefined | boolean | Signal<T> | T, defaultInitial: T): Signal<T> | undefined {
  if (!feature) {
    return undefined;
  }
  if (feature === true) {
    const [get, set] = createSignal(defaultInitial);
    return [get, set];
  }
  if (Array.isArray(feature) && feature.length === 2 && typeof feature[0] === "function") {
    return feature;
  }
  const [get, set] = createSignal(feature as T);
  return [get, set];
}
