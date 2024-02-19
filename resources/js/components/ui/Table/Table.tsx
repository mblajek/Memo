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
import {currentTime, cx, debouncedAccessor, useLangFunc} from "components/utils";
import {NonBlocking} from "components/utils/NonBlocking";
import {TOptions} from "i18next";
import {
  Accessor,
  For,
  Index,
  JSX,
  Show,
  Signal,
  VoidProps,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  on,
} from "solid-js";
import {Dynamic} from "solid-js/web";
import {TableContext, getHeaders, useTableCells} from ".";
import {LoadingPane} from "../LoadingPane";
import {BigSpinner} from "../Spinner";
import {EMPTY_VALUE_SYMBOL} from "../symbols";
import {CellRenderer} from "./CellRenderer";
import s from "./Table.module.scss";

export interface TableTranslations {
  tableName(o?: TOptions): string;
  columnName(column: string, o?: TOptions): string;
  /** Summary of the table, taking the number of rows as count. */
  summary(o?: TOptions): string;
}

export function createTableTranslations(tableName: string | string[]): TableTranslations {
  const t = useLangFunc();
  const names = typeof tableName === "string" ? [tableName] : tableName;
  const tableNameKeys = [
    ...names.map((n) => `tables.tables.${n}.tableName`),
    ...names.map((n) => `models.${n}._name_plural`),
    `tables.tables.generic.tableName`,
  ];
  const columnNameKeyPrefixes = [
    ...names.map((n) => `tables.tables.${n}.columnNames.`),
    ...names.map((n) => `models.${n}.`),
    `tables.tables.generic.columnNames.`,
    `models.generic.`,
  ];
  const summaryKeys = [...names.map((n) => `tables.tables.${n}.summary`), `tables.tables.generic.summary`];
  return {
    tableName: (o) => t(tableNameKeys, o),
    columnName: (column, o) =>
      t(
        columnNameKeyPrefixes.map((p) => p + column),
        o,
      ),
    summary: (o) => t(summaryKeys, o),
  };
}

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    /** An optional table id, used to differentiate element ids if there are multiple tables on the page. */
    readonly tableId?: string;
    /** The translations for the table, used by various table-related components. */
    readonly translations?: TableTranslations;
    readonly defaultColumnVisibility?: Accessor<VisibilityState>;
    readonly exportConfig?: TableExportConfig;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * The simple representation of the translated column name. If set, overrides the value from
     * table meta translations.
     */
    readonly columnName?: () => JSX.Element;
  }
}

export interface TableExportConfig {
  /** A table name override used to create the export file name. */
  readonly tableName?: string;
}

/**
 * Mode in which the table is displayed:
 * - standalone - the table is the main element on the page, typically displays many rows,
 * header and footer are sticky.
 * - embedded - the table is displayed along with other elements in a page, typically with not
 * many rows, without sticky elements.
 */
export type DisplayMode = "standalone" | "embedded";

/**
 * Column def params that make the column auto-size, i.e. wrap contents and not be user-resizable.
 * Can be specified as defaultColumn to make all column auto-sized.
 */
export const AUTO_SIZE_COLUMN_DEFS = {
  enableResizing: false,
  minSize: 0,
  size: 0,
} satisfies Partial<ColumnDef<object>>;

interface Props<T = object> {
  readonly table: TanStackTable<T>;
  /** Table mode. Default: embedded. */
  readonly mode?: DisplayMode;
  /**
   * The iteration component used for iterating over rows. Default: For.
   *
   * The For iteration might be more useful for a frontend table, where the rows is a constant
   * collection of elements. For backend tables, when the rows change identity after each query
   * to the backend, Index might be a better choice.
   */
  readonly rowsIteration?: "For" | "Index";
  /**
   * Whether to use the `<NonBlocking>` component for rendering rows, which reduces page freezing.
   * Default: false.
   */
  readonly nonBlocking?: boolean;
  /** The content to put above the table, e.g. the global search bar. It has access to the table context */
  readonly aboveTable?: () => JSX.Element;
  /** The content to put below the table, e.g. the pagination controller. It has access to the table context */
  readonly belowTable?: () => JSX.Element;
  /** Whether the whole table content is loading. This hides the whole table and displays a spinner. */
  readonly isLoading?: boolean;
  /** Whether the content of the table is reloading. This dims the table and makes it inert. */
  readonly isDimmed?: boolean;
  /** A signal which changes when the table should scroll itself to the top. */
  readonly scrollToTopSignal?: Accessor<unknown>;
}

const DEFAULT_PROPS = {
  mode: "embedded",
  rowsIteration: "For",
  nonBlocking: false,
  isLoading: false,
  isDimmed: false,
} satisfies Partial<Props>;

/**
 * A table. Most aspects of the table are controlled by props.table, some additional options
 * are controlled via other props.
 *
 * Limitations:
 * - no column groups
 * - no foldable rows
 */
export const Table = <T,>(allProps: VoidProps<Props<T>>): JSX.Element => {
  const props = mergeProps(DEFAULT_PROPS, allProps);
  let scrollToTopElement: HTMLDivElement | undefined;
  createEffect(
    on(
      () => props.scrollToTopSignal?.(),
      (_input, prevInput) => {
        if (props.mode === "standalone" && prevInput !== undefined) {
          scrollToTopElement?.scrollIntoView({behavior: "smooth"});
        }
      },
    ),
  );
  const gridTemplateColumns = () =>
    props.table
      .getVisibleLeafColumns()
      .map((c) => (!c.getCanResize() && c.getSize() === AUTO_SIZE_COLUMN_DEFS.size ? "auto" : `${c.getSize()}px`))
      .join(" ");
  // Implement horizontal scrolling on mouse wheel on the table header.
  // The simplest implementation of calling scrollBy in the onWheel handler does not work well if
  // smooth scrolling is used. That's why this code tracks the desired position in a signal and scrolls
  // to it when no scrolling is taking place at the moment.
  const [scrollingWrapper, setScrollingWrapper] = createSignal<HTMLDivElement>();
  const [lastScrollTimestamp, setLastScrollTimestamp] = createSignal(0);
  // Whether the table is currently scrolling. This is true after setting lastScrollTimestamp to 0
  // in onScrollEnd, but also after enough time is elapsed since the last onScroll event, because in some
  // situations the onScrollEnd event is not reliable, and we don't want to get stuck thinking the table
  // is still scrolling when it's not.
  const isScrolling = createMemo(() => currentTime().toMillis() - lastScrollTimestamp() < 100);
  const [desiredScrollX, setDesiredScrollX] = createSignal<number>();
  createEffect(
    on(
      [
        scrollingWrapper,
        isScrolling,
        // Allow multiple steps to accummulate before this is triggered. This improves smoothness.
        // eslint-disable-next-line solid/reactivity
        debouncedAccessor(desiredScrollX, {
          timeMs: 100,
          outputImmediately: (x) => x === undefined,
        }),
      ],
      ([scrWrapper, isScrolling]) => {
        if (scrWrapper && !isScrolling) {
          // Use the most up-to-date value of desiredScrollX, not the debounced one.
          const desiredX = desiredScrollX();
          // Use a tolerance when comparing. Some devices count position with fractional pixels.
          if (desiredX !== undefined && Math.abs(desiredX - scrWrapper.scrollLeft) >= 2) {
            scrWrapper.scrollTo({left: desiredX, behavior: "smooth"});
          } else {
            setDesiredScrollX(undefined);
          }
        }
      },
    ),
  );
  return (
    // eslint-disable-next-line solid/reactivity
    <TableContext.Provider value={props.table}>
      <Show when={!props.isLoading} fallback={<BigSpinner />}>
        <div class={cx(s.tableContainer, s[props.mode])}>
          <Show when={props.aboveTable?.()}>{(aboveTable) => <div class={s.aboveTable}>{aboveTable()}</div>}</Show>
          <div class={s.tableMain}>
            <div
              ref={setScrollingWrapper}
              class={s.scrollingWrapper}
              onScroll={[setLastScrollTimestamp, Date.now()]}
              onScrollEnd={[setLastScrollTimestamp, 0]}
            >
              <div ref={scrollToTopElement} class={s.scrollToTopElement}>
                <div class={s.tableBg}>
                  <div class={s.table} style={{"grid-template-columns": gridTemplateColumns()}}>
                    <div
                      ref={(div) =>
                        div.addEventListener(
                          "wheel",
                          (e) => {
                            if (e.deltaX) {
                              // With 2d wheels (like a touchpad) avoid too much interference between the axes.
                              setDesiredScrollX(undefined);
                              return;
                            }
                            const scrWrapper = scrollingWrapper();
                            if (scrWrapper && !e.shiftKey && e.deltaY) {
                              setDesiredScrollX((l = scrWrapper.scrollLeft) =>
                                Math.min(Math.max(l + e.deltaY, 0), scrWrapper.scrollWidth - scrWrapper.clientWidth),
                              );
                              e.preventDefault();
                            }
                          },
                          {passive: false},
                        )
                      }
                      class={s.headerRow}
                    >
                      <For each={getHeaders(props.table)}>
                        {({header, column}) => (
                          <Show when={header()}>
                            {(header) => (
                              <div class={s.cell}>
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
                      fallback={<div class={s.wideRow}>{EMPTY_VALUE_SYMBOL}</div>}
                    >
                      {(rowMaybeAccessor: Row<T> | Accessor<Row<T>>) => {
                        const row = typeof rowMaybeAccessor === "function" ? rowMaybeAccessor : () => rowMaybeAccessor;
                        return (
                          <NonBlocking nonBlocking={props.nonBlocking}>
                            <div class={s.dataRow} inert={props.isDimmed || undefined}>
                              <Index each={row().getVisibleCells()}>
                                {(cell) => (
                                  <span class={s.cell}>
                                    <CellRenderer
                                      component={cell().column.columnDef.cell}
                                      props={cell().getContext()}
                                    />
                                  </span>
                                )}
                              </Index>
                            </div>
                          </NonBlocking>
                        );
                      }}
                    </Dynamic>
                    <div class={s.bottomBorder} />
                  </div>
                </div>
              </div>
            </div>
            <div class={s.dimmingPane}>
              <LoadingPane isLoading={props.isDimmed} />
            </div>
          </div>
          <Show when={props.belowTable?.()}>{(belowTable) => <div class={s.belowTable}>{belowTable()}</div>}</Show>
        </div>
      </Show>
    </TableContext.Provider>
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
      header: tableCells.defaultHeader(),
      cell: tableCells.default(),
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
