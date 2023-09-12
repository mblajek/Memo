import {
  ColumnDef,
  IdentifiedColumnDef,
  RowData,
  SortingState,
  createColumnHelper,
  createSolidTable,
} from "@tanstack/solid-table";
import {cx} from "components/utils";
import {ColumnType, Filter, createTQuery, createTableRequestCreator, tableHelper} from "data-access/memo-api/tquery";
import {Component, createMemo} from "solid-js";
import {
  ABOVE_AND_BELOW_TABLE_DEFAULT_CSS,
  DisplayMode,
  Header,
  IdColumn,
  Pagination,
  Table,
  TableColumnVisibilityController,
  TableSearch,
  TableSummary,
  TableTranslations,
  cellFunc,
  createTableTranslations,
  getBaseTableOptions,
  useTableCells,
} from ".";
import {ColumnFilterController, FilteringParams} from "..";

export interface ColumnOptions {
  columnDef?: Partial<IdentifiedColumnDef<object>>;
  metaParams?: ColumnMetaParams;
}

interface ColumnMetaParams {
  canControlVisibility?: boolean;
  filtering?: FilteringParams;
}

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    tquery?: TQueryColumnMeta;
  }
}

/** Type of tquery-related information in column meta. */
export interface TQueryColumnMeta extends ColumnMetaParams {
  /** Column type, if the column is based on data from backend. */
  type?: ColumnType;
}

export interface TQueryTableProps {
  /**
   * Mode in which the table is displayed:
   * - standalone - the table is the main element on the page, typically displays many rows,
   * header and footer are sticky.
   * - embedded - the table is displayed along with other elements in a page, typically with not
   * many rows, without sticky elements.
   */
  mode: DisplayMode;
  /** The prefix used for the data query (this allows invalidating the tquery data). */
  staticPrefixQueryKey: readonly unknown[];
  /** The entity URL, must not change. */
  staticEntityURL: string;
  staticTranslations?: TableTranslations;
  /**
   * The filter that is always applied to the data, regardless of other filtering.
   * This is used to create e.g. a table of entities A on the details page of a particular
   * entity B, so only entities A related direclty to that particular entity B should be shown.
   */
  intrinsicFilter?: Filter;
  /**
   * A list of columns that are always included in the request (and available on the row objects),
   * even if they are not visible.
   */
  intrinsicColumns?: string[];
  /** Additional column names. Their options are taken from `columnOptions`. */
  additionalColumns?: string[];
  /** Overrides for the definition of specific columns. */
  columnOptions?: Partial<Record<string, ColumnOptions>>;
  /**
   * The ordering of the columns. All the columns present on the backend and not present
   * in this list are placed at the end.
   *
   * This list can be used to sort both data-based columns and additional columns
   * (declared in additionalColumns).
   *
   * In the current implementation the order of columns cannot be changed.
   */
  initialColumnsOrder?: string[];
  initialVisibleColumns?: string[];
  initialSort?: SortingState;
  initialPageSize?: number;
}

const DEFAULT_STANDALONE_PAGE_SIZE = 50;
const DEFAULT_EMBEDDED_PAGE_SIZE = 10;

export const TQueryTable: Component<TQueryTableProps> = (props) => {
  const entityURL = props.staticEntityURL;

  const tableCells = useTableCells();
  const columnDefByType = new Map<ColumnType, Partial<IdentifiedColumnDef<object>>>([
    ["uuid", {cell: cellFunc<string>((v) => <IdColumn id={v} />), enableSorting: false, size: 80}],
    ["text", {enableSorting: false}],
    ["decimal0", {cell: tableCells.decimal0}],
    ["decimal2", {cell: tableCells.decimal2}],
    ["bool", {cell: tableCells.bool, size: 100}],
    ["date", {cell: tableCells.date}],
    ["datetime", {cell: tableCells.datetime}],
  ]);

  const requestCreator = createTableRequestCreator({
    intrinsicFilter: () => props.intrinsicFilter,
    intrinsicColumns: () => props.intrinsicColumns,
    additionalColumns: props.additionalColumns,
    initialVisibleColumns: props.initialVisibleColumns,
    initialSort: props.initialSort,
    initialPageSize:
      props.initialPageSize ||
      (props.mode === "standalone" ? DEFAULT_STANDALONE_PAGE_SIZE : DEFAULT_EMBEDDED_PAGE_SIZE),
  });
  const {schema, requestController, dataQuery, data} = createTQuery({
    entityURL,
    prefixQueryKey: props.staticPrefixQueryKey,
    requestCreator,
  });
  const {
    columnVisibility,
    globalFilter,
    columnFilters: [columnFilters, setColumnFilters],
    sorting,
    pagination,
  } = requestController;
  const {rowsCount, pageCount, scrollToTopSignal} = tableHelper({
    requestController,
    response: () => dataQuery.data,
  });

  const h = createColumnHelper<object>();
  function columnOptions(name: string) {
    return props.columnOptions?.[name] || {};
  }
  function commonColumnDef(name: string, type?: ColumnType) {
    return {
      id: name,
      header: (ctx) => (
        <Header
          ctx={ctx}
          filter={
            <ColumnFilterController
              name={ctx.column.id}
              filter={columnFilters[ctx.column.id]}
              setFilter={(filter) => setColumnFilters(ctx.column.id, filter)}
            />
          }
        />
      ),
      ...(type && columnDefByType.get(type)),
      ...columnOptions(name).columnDef,
    } satisfies Partial<IdentifiedColumnDef<object>>;
  }
  const columns = createMemo(() => {
    const sch = schema();
    if (sch) {
      const badColumns = new Set(Object.keys(props.columnOptions || {}));
      for (const {name} of sch.columns) {
        badColumns.delete(name);
      }
      for (const name of props.additionalColumns || []) {
        badColumns.delete(name);
      }
      if (badColumns.size)
        console.error(`Some columns are configured but not present in the columns list: ` + [...badColumns].join(", "));
      const columns = [
        ...sch.columns.map(({type, name}) => {
          const common = commonColumnDef(name, type);
          return h.accessor(name, {
            ...common,
            meta: {
              ...common.meta,
              tquery: {
                type,
                ...columnOptions(name).metaParams,
              } satisfies TQueryColumnMeta,
            },
          });
        }),
        ...(props.additionalColumns || []).map((name) => {
          const common = commonColumnDef(name);
          return h.display({
            ...common,
            meta: {
              ...common.meta,
              tquery: {
                ...columnOptions(name).metaParams,
              },
            },
          });
        }),
      ];
      if (props.initialColumnsOrder) {
        // Index in the ordering array. Missing items sorted last.
        const order = (col: ColumnDef<object, unknown>) => (props.initialColumnsOrder!.indexOf(col.id!) + 1e6) % 1e6;
        columns.sort((a, b) => order(a) - order(b));
      }
      return columns;
    }
    return [];
  });

  const table = createSolidTable({
    ...getBaseTableOptions<object>({features: {columnVisibility, sorting, globalFilter, pagination}}),
    get data() {
      return data();
    },
    get columns() {
      return columns();
    },
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    get pageCount() {
      return pageCount();
    },
    autoResetPageIndex: false,
    meta: {
      translations: props.staticTranslations || createTableTranslations("generic"),
    },
  });

  return (
    <Table
      table={table}
      mode={props.mode}
      autoColumnSize={false}
      rowsIteration="Index"
      aboveTable={() => (
        <div class={cx(ABOVE_AND_BELOW_TABLE_DEFAULT_CSS, "gap-1")}>
          <TableSearch />
          <TableColumnVisibilityController />
        </div>
      )}
      belowTable={() => (
        <div class={cx(ABOVE_AND_BELOW_TABLE_DEFAULT_CSS, "gap-2")}>
          <Pagination />
          <TableSummary rowsCount={rowsCount()} />
        </div>
      )}
      isLoading={!schema()}
      isDimmed={dataQuery.isFetching}
      scrollToTopSignal={scrollToTopSignal}
    />
  );
};
