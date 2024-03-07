import {
  ColumnDef,
  ColumnSizingState,
  HeaderContext,
  IdentifiedColumnDef,
  RowData,
  Table as SolidTable,
  SortingState,
  VisibilityState,
  createSolidTable,
} from "@tanstack/solid-table";
import {createLocalStoragePersistence} from "components/persistence/persistence";
import {richJSONSerialiser} from "components/persistence/serialiser";
import {NON_NULLABLE, debouncedAccessor} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {objectRecursiveMerge} from "components/utils/object_merge";
import {ToastMessages, toastError} from "components/utils/toast";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {getAllRowsExportIterator} from "data-access/memo-api/tquery/export";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {
  ColumnConfig,
  createTableRequestCreator,
  getDefaultColumnVisibility,
  tableHelper,
} from "data-access/memo-api/tquery/table";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {
  ColumnName,
  ColumnType,
  DataColumnSchema,
  DataItem,
  Sort,
  isDataColumn,
} from "data-access/memo-api/tquery/types";
import {
  JSX,
  Signal,
  VoidComponent,
  batch,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import {
  DisplayMode,
  Header,
  Pagination,
  Table,
  TableColumnVisibilityController,
  TableExportConfig,
  TableSearch,
  TableSummary,
  TableTranslations,
  createTableTranslations,
  getBaseTableOptions,
  useTableCells,
} from ".";
import {TableExportButton} from "./TableExportButton";
import {TableFiltersClearButton} from "./TableFiltersClearButton";
import {ExportCellFunc, useTableTextExportCells} from "./table_export_cells";
import {ColumnFilterController, FilteringParams} from "./tquery_filters/ColumnFilterController";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    readonly tquery?: TQueryTableMeta<TData>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    readonly tquery?: TQueryColumnMeta<TData>;
  }
}

interface TQueryTableMeta<TData extends RowData> {
  /** Iterator over all the rows, for export purposes. */
  readonly allRowsExportIterable?: AllRowsExportIterable<TData>;
}

export type AllRowsExportIterable<TData extends RowData = RowData> = AsyncIterable<TData> & {readonly length?: number};

export interface ColumnMetaParams<TData = DataItem> {
  readonly filtering?: FilteringParams;
  /**
   * Whether this column is a DEV column, i.e. an unconfigured column taken directly from tquery schema,
   * displayed only in DEV mode.
   */
  readonly devColumn?: boolean;
  readonly textExportCell?: ExportCellFunc<string | undefined, TData>;
}

/** Type of tquery-related information in column meta. */
export type TQueryColumnMeta<TData = DataItem> = ColumnMetaParams<TData> & Partial<DataColumnSchema>;

export interface TQueryTableProps<TData = DataItem> {
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
  /** The key to use for persisting the parameters of the displayed page. If not present, nothing is persisted. */
  readonly staticPersistenceKey?: string;
  /** A differentiator to be used when there are multiple tables on a page. */
  readonly staticTableId?: string;
  /**
   * Whether to use the `<NonBlocking>` component for rendering rows, which reduces page freezing.
   * Default: false.
   */
  readonly nonBlocking?: boolean;
  /**
   * The filter that is always applied to the data, regardless of other filtering.
   * This is used to create e.g. a table of entities A on the details page of a particular
   * entity B, so only entities A related direclty to that particular entity B should be shown.
   */
  readonly intrinsicFilter?: FilterH;
  /** The sort that is always applied to the data at the end of the filter specified by the user. */
  readonly intrinsicSort?: Sort;
  /** The definition of the columns in the table, in their correct order. */
  readonly columns: readonly PartialColumnConfigEntry<TData>[];
  readonly initialSort?: SortingState;
  readonly initialPageSize?: number;
  /** Element to put below table, after the summary. */
  readonly customSectionBelowTable?: JSX.Element;
  readonly exportConfig?: TableExportConfig;
}

export interface PartialColumnConfig<TData = DataItem> {
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
  readonly columnDef?: IdentifiedColumnDef<TData>;
  /** Override for the column header. */
  readonly header?: (params: HeaderParams<TData>) => JSX.Element;
  /** Some meta params for the column. They are merged into columnDef.meta.tquery (this is a shorthand). */
  readonly metaParams?: ColumnMetaParams<TData>;
  /** The initial column visibility. Default: true. */
  readonly initialVisible?: boolean;
}

interface HeaderParams<TData = DataItem> {
  readonly ctx: HeaderContext<TData, unknown>;
  readonly filter: Signal<FilterH | undefined>;
  readonly defFilterControl: () => JSX.Element;
}

type PartialColumnConfigEntry<TData> = PartialColumnConfig<TData> | "nonFixedAttributes";

interface FullColumnConfig<TData = DataItem> extends ColumnConfig {
  /** Whether this column has a corresponding tquery column (with the same name) that it shows. */
  readonly isDataColumn: boolean;
  readonly columnDef: IdentifiedColumnDef<TData>;
  readonly header?: (params: HeaderParams<TData>) => JSX.Element;
  readonly metaParams?: ColumnMetaParams;
}

function columnConfigFromPartial({
  name,
  isDataColumn = true,
  extraDataColumns = [],
  columnDef = {},
  header,
  metaParams,
  initialVisible = true,
}: PartialColumnConfig): FullColumnConfig {
  return {
    name,
    isDataColumn,
    dataColumns: isDataColumn ? [name, ...extraDataColumns] : extraDataColumns,
    columnDef,
    header,
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
  readonly colSize: Readonly<ColumnSizingState>;
};
const PERSISTENCE_VERSION = 2;

export const TQueryTable: VoidComponent<TQueryTableProps> = (props) => {
  const attributes = useAttributes();
  const entityURL = props.staticEntityURL;
  const [nonFixedAttributeColumns, setNonFixedAttributeColumns] = createSignal<DataColumnSchema[]>([]);
  const nonFixedAttributeColumnsConfig = () =>
    nonFixedAttributeColumns().map(
      (col) => ({name: col.name, initialVisible: false}) satisfies PartialColumnConfig<DataItem>,
    );
  const [devColumns, setDevColumns] = createSignal<DataColumnSchema[]>([]);
  const devColumnsConfig = () =>
    devColumns().map(
      (col) =>
        ({
          name: col.name,
          metaParams: {devColumn: true},
          initialVisible: false,
        }) satisfies PartialColumnConfig<DataItem>,
    );
  const columnsConfig = createMemo(() =>
    [
      ...props.columns.flatMap<PartialColumnConfig<DataItem>>((colEntry) =>
        colEntry === "nonFixedAttributes" ? nonFixedAttributeColumnsConfig() : [colEntry],
      ),
      ...devColumnsConfig(),
    ].map((col) => columnConfigFromPartial(col)),
  );

  const tableCells = useTableCells();
  const tableTextExportCells = useTableTextExportCells();
  const defaultColumnConfigByType = new Map<ColumnType, Partial<PartialColumnConfig<DataItem>>>()
    .set("bool", {
      columnDef: {cell: tableCells.bool(), size: 100},
      metaParams: {textExportCell: tableTextExportCells.bool()},
    })
    .set("date", {
      columnDef: {cell: tableCells.date()},
      metaParams: {textExportCell: tableTextExportCells.date()},
    })
    .set("datetime", {
      columnDef: {cell: tableCells.datetime()},
      metaParams: {textExportCell: tableTextExportCells.datetime()},
    })
    .set("int", {
      columnDef: {cell: tableCells.int(), size: 150},
      metaParams: {textExportCell: tableTextExportCells.int()},
    })
    .set("list", {
      columnDef: {enableSorting: false},
      metaParams: {textExportCell: tableTextExportCells.list()},
    })
    .set("object", {
      columnDef: {enableSorting: false},
      metaParams: {textExportCell: tableTextExportCells.object()},
    })
    .set("string", {})
    .set("text", {
      columnDef: {enableSorting: false},
    })
    .set("uuid", {
      columnDef: {cell: tableCells.uuid(), enableSorting: false, size: 80},
      metaParams: {textExportCell: tableTextExportCells.uuid()},
    })
    .set("uuid_list", {
      columnDef: {cell: tableCells.uuidList(), enableSorting: false, size: 80},
      metaParams: {textExportCell: tableTextExportCells.uuidList()},
    })
    .set("dict", {
      columnDef: {cell: tableCells.dict()},
      metaParams: {textExportCell: tableTextExportCells.dict()},
    })
    .set("dict_list", {
      columnDef: {cell: tableCells.dictList(), enableSorting: false, size: 270},
      metaParams: {textExportCell: tableTextExportCells.dictList()},
    });

  const requestCreator = createTableRequestCreator({
    columnsConfig,
    intrinsicFilter: () => props.intrinsicFilter,
    intrinsicSort: () => props.intrinsicSort,
    initialSort: props.initialSort,
    initialPageSize:
      props.initialPageSize ||
      (props.mode === "standalone" ? DEFAULT_STANDALONE_PAGE_SIZE : DEFAULT_EMBEDDED_PAGE_SIZE),
  });
  const [allInitialised, setAllInitialised] = createSignal(false);
  const {schema, request, requestController, dataQuery} = createTQuery({
    entityURL,
    prefixQueryKey: props.staticPrefixQueryKey,
    requestCreator,
    dataQueryOptions: () => ({
      enabled: allInitialised(),
      meta: {tquery: {isTable: true}},
    }),
  });
  createComputed(() => {
    const sch = schema();
    if (sch) {
      if (attributes()) {
        batch(() => {
          const configuredColumns = new Set();
          for (const colEntry of props.columns) {
            if (colEntry !== "nonFixedAttributes") {
              configuredColumns.add(colEntry.name);
            }
          }
          setNonFixedAttributeColumns(
            sch.columns
              .map((col) => {
                if (!isDataColumn(col)) {
                  return undefined;
                }
                if (col.attributeId) {
                  const attribute = attributes()!.get(col.attributeId);
                  if (!attribute.isFixed) {
                    if (configuredColumns.has(col.name)) {
                      console.warn(
                        `Column ${col.name} is configured statically, but it is a non-fixed attribute ${attribute.name}.`,
                      );
                      return undefined;
                    }
                    return col;
                  }
                }
                return undefined;
              })
              .filter(NON_NULLABLE),
          );
          if (isDEV()) {
            for (const col of nonFixedAttributeColumns()) {
              configuredColumns.add(col.name);
            }
            setDevColumns(sch.columns.filter(isDataColumn).filter(({name}) => !configuredColumns.has(name)));
          } else {
            setDevColumns([]);
          }
        });
      }
    }
  });
  const {
    columnVisibility,
    globalFilter,
    getColumnFilter,
    columnsWithActiveFilters,
    clearColumnFilters,
    sorting,
    pagination,
  } = requestController;
  const [table, setTable] = createSignal<SolidTable<DataItem>>();
  if (props.staticPersistenceKey) {
    // eslint-disable-next-line solid/reactivity
    const columnSizing = debouncedAccessor(() => table()?.getState().columnSizing, {timeMs: 500});
    createLocalStoragePersistence<PersistentState>({
      key: `TQueryTable:${props.staticPersistenceKey}`,
      value: () => ({
        colVis: columnVisibility[0](),
        colSize: columnSizing() || {},
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
        onMount(() => table()!.setColumnSizing(value.colSize || {}));
      },
      serialiser: richJSONSerialiser<PersistentState>(),
      version: [PERSISTENCE_VERSION],
    });
  }
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
      toastError(<ToastMessages messages={[...errors]} />);
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
      const defColumnConfig = (schemaCol && defaultColumnConfigByType.get(schemaCol.type)) || {};
      const filter = getColumnFilter(col.name);
      const defFilterControl = (ctx: HeaderContext<DataItem, unknown>) => (
        <ColumnFilterController name={ctx.column.id} filter={filter[0]()} setFilter={filter[1]} />
      );
      return objectRecursiveMerge<ColumnDef<DataItem, unknown>>(
        {
          id: col.name,
          accessorFn: col.isDataColumn ? (originalRow) => originalRow[col.name] : undefined,
          header: (ctx) => <Header ctx={ctx} filter={defFilterControl(ctx)} />,
        },
        // It would be ideal to restrict the cell function to only accessing the data columns declared
        // by the column config, but there is no easy way to do this. The whole row is a store and cannot
        // be mutated, and wrapping it would be complicated.
        defColumnConfig.columnDef,
        col.header && {
          header: (ctx) => col.header!({ctx, filter, defFilterControl: () => defFilterControl(ctx)}),
        },
        col.columnDef,
        {meta: {tquery: schemaCol}},
        {meta: {tquery: defColumnConfig.metaParams}},
        {meta: {tquery: col.metaParams}},
      ) satisfies ColumnDef<DataItem, unknown>;
    });
  });

  setTable(
    createSolidTable<DataItem>({
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
        tableId: props.staticTableId,
        translations: props.staticTranslations || createTableTranslations("generic"),
        defaultColumnVisibility,
        exportConfig: props.exportConfig,
        tquery: {
          allRowsExportIterable: {
            [Symbol.asyncIterator]: () =>
              getAllRowsExportIterator({
                entityURL: props.staticEntityURL,
                baseRequest: request()!,
              }),
            get length() {
              return rowsCount();
            },
          },
        },
      },
    }),
  );

  return (
    <Table
      table={table()!}
      mode={props.mode}
      rowsIteration="Index"
      nonBlocking={props.nonBlocking}
      aboveTable={() => (
        <div class="min-h-small-input flex items-stretch gap-1">
          <TableSearch divClass="flex-grow" />
          <TableFiltersClearButton
            columnsWithActiveFilters={columnsWithActiveFilters()}
            clearColumnFilters={clearColumnFilters}
          />
          <TableColumnVisibilityController />
        </div>
      )}
      belowTable={() => (
        <div class="min-h-small-input flex items-stretch justify-between gap-2 text-base">
          <div class="flex items-stretch gap-2">
            <Pagination />
            <TableSummary rowsCount={rowsCount()} />
            {props.customSectionBelowTable}
          </div>
          <TableExportButton />
        </div>
      )}
      isLoading={!schema()}
      isDimmed={dataQuery.isFetching}
      scrollToTopSignal={scrollToTopSignal}
    />
  );
};
