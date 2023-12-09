import {
  ColumnDef,
  IdentifiedColumnDef,
  RowData,
  SortingState,
  VisibilityState,
  createSolidTable,
} from "@tanstack/solid-table";
import {createLocalStoragePersistence} from "components/persistence/persistence";
import {richJSONSerialiser} from "components/persistence/serialiser";
import {NON_NULLABLE} from "components/utils";
import {toastMessages} from "components/utils/toast";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {
  ColumnConfig,
  createTableRequestCreator,
  getDefaultColumnVisibility,
  tableHelper,
} from "data-access/memo-api/tquery/table";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {ColumnName, ColumnType, DataColumnSchema, DataItem, isDataColumn} from "data-access/memo-api/tquery/types";
import {DEV, JSX, VoidComponent, createComputed, createEffect, createMemo, createSignal} from "solid-js";
import toast from "solid-toast";
import {
  DisplayMode,
  Header,
  Pagination,
  Table,
  TableColumnVisibilityController,
  TableSearch,
  TableSummary,
  TableTranslations,
  createTableTranslations,
  getBaseTableOptions,
  useTableCells,
} from ".";
import {ColumnFilterController, FilteringParams} from "./tquery_filters/ColumnFilterController";

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    readonly tquery?: TQueryColumnMeta;
  }
}

export interface ColumnMetaParams {
  readonly filtering?: FilteringParams;
  /**
   * Whether this column is a DEV column, i.e. an unconfigured column taken directly from tquery schema,
   * displayed only in DEV mode.
   */
  readonly devColumn?: boolean;
}

/** Type of tquery-related information in column meta. */
export type TQueryColumnMeta = ColumnMetaParams & Partial<DataColumnSchema>;

export interface TQueryTableProps {
  /**
   * Mode in which the table is displayed:
   * - standalone - the table is the main element on the page, typically displays many rows,
   * header and footer are sticky.
   * - embedded - the table is displayed along with other elements in a page, typically with not
   * many rows, without sticky elements.
   */
  readonly mode: DisplayMode;
  /** The prefix used for the data query (this allows invalidating the tquery data). */
  readonly staticPrefixQueryKey: readonly unknown[];
  /** The entity URL, must not change. */
  readonly staticEntityURL: string;
  readonly staticTranslations?: TableTranslations;
  /**
   * The key part used to persist the table settings.
   * If not provided, the settings are persisted with the entity URL as the key. Specifying this
   * key allows persisting the settings separately for different tables showing the same entity.
   */
  readonly staticPersistenceKey?: string;
  /**
   * The filter that is always applied to the data, regardless of other filtering.
   * This is used to create e.g. a table of entities A on the details page of a particular
   * entity B, so only entities A related direclty to that particular entity B should be shown.
   */
  readonly intrinsicFilter?: FilterH;
  /** The definition of the columns in the table, in their correct order. */
  readonly columns: readonly PartialColumnConfig[];
  readonly initialSort?: SortingState;
  readonly initialPageSize?: number;
  /** Element to put below table, after the summary. */
  readonly customSectionBelowTable?: JSX.Element;
}

export interface PartialColumnConfig {
  /** The name (id) of the column. */
  readonly name: string;
  /**
   * Whether this column has a corresponding tquery column (with the same name) that it shows.
   * Default: true.
   */
  readonly isDataColumn?: boolean;
  /** Additional columns from the tquery row that are used to construct the displayed value. */
  readonly extraDataColumns?: readonly ColumnName[];
  /**
   * The TanStack column definition. If isDataColumn, the tquery column is displayed by
   * default. Otherwise, columnDef needs to be specified to display anything.
   * All additional data columns used in columnDef.cell needs to be specified in extraDataColumns.
   */
  readonly columnDef?: IdentifiedColumnDef<DataItem>;
  /** Some meta params for the column. They are merged into columnDef.meta.tquery (this is a shorthand). */
  readonly metaParams?: ColumnMetaParams;
  /** The initial column visibility. Default: true. */
  readonly initialVisible?: boolean;
}

interface FullColumnConfig extends ColumnConfig {
  /** Whether this column has a corresponding tquery column (with the same name) that it shows. */
  readonly isDataColumn: boolean;
  readonly columnDef: IdentifiedColumnDef<DataItem>;
  readonly metaParams?: ColumnMetaParams;
}

function columnConfigFromPartial({
  name,
  isDataColumn = true,
  extraDataColumns = [],
  columnDef = {},
  metaParams,
  initialVisible = true,
}: PartialColumnConfig): FullColumnConfig {
  return {
    name,
    isDataColumn,
    dataColumns: isDataColumn ? [name, ...extraDataColumns] : extraDataColumns,
    columnDef,
    metaParams,
    initialVisible,
  };
}

const DEFAULT_STANDALONE_PAGE_SIZE = 50;
const DEFAULT_EMBEDDED_PAGE_SIZE = 10;

/**
 * The state of the table persisted in the local storage.
 *
 * Warning: Changing this type may break the persistence and the whole application in a browser.
 * Either make sure the change is backwards compatible (allows reading earlier data),
 * or bump the version of the persistence.
 */
type PersistentState = {
  readonly colVis: Readonly<VisibilityState>;
};
const PERSISTENCE_VERSION = 2;

export const TQueryTable: VoidComponent<TQueryTableProps> = (props) => {
  const entityURL = props.staticEntityURL;
  const [devColumns, setDevColumns] = createSignal<DataColumnSchema[]>([]);
  const columnsConfig = createMemo(() =>
    [
      ...props.columns,
      ...devColumns().map((col) => ({
        name: col.name,
        metaParams: {
          devColumn: true,
        },
        initialVisible: false,
      })),
    ].map((col) => columnConfigFromPartial(col)),
  );

  const tableCells = useTableCells();
  const columnDefByType = new Map<ColumnType, Partial<IdentifiedColumnDef<DataItem>>>([
    ["bool", {cell: tableCells.bool, size: 100}],
    ["date", {cell: tableCells.date}],
    ["datetime", {cell: tableCells.datetime}],
    ["int", {cell: tableCells.int}],
    ["string", {}],
    ["text", {enableSorting: false}],
    ["uuid", {cell: tableCells.uuid, enableSorting: false, size: 80}],
  ]);

  const [allInitialised, setAllInitialised] = createSignal(false);
  const requestCreator = createTableRequestCreator({
    columnsConfig,
    intrinsicFilter: () => props.intrinsicFilter,
    initialSort: props.initialSort,
    initialPageSize:
      props.initialPageSize ||
      (props.mode === "standalone" ? DEFAULT_STANDALONE_PAGE_SIZE : DEFAULT_EMBEDDED_PAGE_SIZE),
    allInitialised,
  });
  const {schema, requestController, dataQuery} = createTQuery({
    entityURL,
    prefixQueryKey: props.staticPrefixQueryKey,
    requestCreator,
    dataQueryOptions: {meta: {tquery: {isTable: true}}},
  });
  if (DEV) {
    createComputed(() =>
      setDevColumns(
        schema()
          ?.columns.filter(isDataColumn)
          .filter(({name}) => !props.columns.some((col) => col.name === name)) || [],
      ),
    );
  }
  const {columnVisibility, globalFilter, getColumnFilter, sorting, pagination} = requestController;
  createLocalStoragePersistence<PersistentState>({
    key: ["TQueryTable", entityURL, props.staticPersistenceKey].filter(NON_NULLABLE).join(":"),
    value: () => ({
      colVis: columnVisibility[0](),
    }),
    onLoad: (value) => {
      // Ensure a bad (e.g. outdated) entry won't affect visibility of a columnn that cannot have
      // the visibility controlled by the user.
      const colVis = {...value.colVis};
      for (const col of columnsConfig()) {
        if (col.columnDef.enableHiding === false) {
          delete colVis[col.name];
        }
      }
      columnVisibility[1](colVis);
    },
    serialiser: richJSONSerialiser<PersistentState>(),
    version: [PERSISTENCE_VERSION],
  });
  // Allow querying data now that the DEV columns are added and columns visibility is loaded.
  setAllInitialised(true);
  const {rowsCount, pageCount, scrollToTopSignal, filterErrors} = tableHelper({
    requestController,
    dataQuery,
    translations: props.staticTranslations,
  });
  createEffect(() => {
    const errors = filterErrors()?.values();
    if (errors) {
      // TODO: Consider showing the errors in the table header.
      toastMessages([...errors], toast.error);
    }
  });
  const defaultColumnVisibility = createMemo(() => getDefaultColumnVisibility(columnsConfig()));

  const columns = createMemo(() => {
    const sch = schema();
    if (!sch) {
      return [];
    }
    return columnsConfig().map((col) => {
      let schemaCol = undefined;
      if (col.isDataColumn) {
        schemaCol = sch.columns.find(({name}) => name === col.name);
        if (!schemaCol) {
          throw new Error(`Column ${col.name} not found in schema`);
        }
        if (schemaCol.type === "count") {
          throw new Error(`Column ${col.name} is a count column`);
        }
      }
      return {
        id: col.name,
        accessorFn: col.isDataColumn ? (originalRow) => originalRow[col.name] : undefined,
        header: (ctx) => (
          <Header
            ctx={ctx}
            filter={
              <ColumnFilterController
                name={ctx.column.id}
                filter={getColumnFilter(ctx.column.id)[0]()}
                setFilter={(filter) => getColumnFilter(ctx.column.id)[1](filter)}
              />
            }
          />
        ),
        ...(schemaCol?.type && columnDefByType.get(schemaCol.type)),
        // It would be ideal to restrict the cell function to only accessing the data columns declared
        // by the column config, but there is no easy way to do this. The whole row is a store and cannot
        // be mutated, and wrapping it would be complicated.
        ...col.columnDef,
        meta: {
          ...col.columnDef.meta,
          tquery: {
            ...schemaCol,
            ...col.metaParams,
          } satisfies TQueryColumnMeta,
        },
      } satisfies ColumnDef<DataItem, unknown>;
    });
  });

  const table = createSolidTable<DataItem>({
    ...getBaseTableOptions<DataItem>({features: {columnVisibility, sorting, globalFilter, pagination}}),
    get data() {
      return (dataQuery.data?.data as DataItem[]) || [];
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
      defaultColumnVisibility,
    },
  });

  return (
    <Table
      table={table}
      mode={props.mode}
      rowsIteration="Index"
      aboveTable={() => (
        <div class="h-8 flex items-stretch gap-1">
          <TableSearch class="flex-grow" />
          <TableColumnVisibilityController />
        </div>
      )}
      belowTable={() => (
        <div class="h-8 flex items-stretch gap-2">
          <Pagination />
          <TableSummary rowsCount={rowsCount()} />
          {props.customSectionBelowTable}
        </div>
      )}
      isLoading={!schema()}
      isDimmed={dataQuery.isFetching}
      scrollToTopSignal={scrollToTopSignal}
    />
  );
};
