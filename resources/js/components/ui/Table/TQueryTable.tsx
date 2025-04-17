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
import {createHistoryPersistence} from "components/persistence/history_persistence";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {Header} from "components/ui/Table/Header";
import {Pagination} from "components/ui/Table/Pagination";
import {
  DisplayMode,
  Table,
  TableExportConfig,
  TableTranslations,
  createTableTranslations,
  getBaseTableOptions,
} from "components/ui/Table/Table";
import {TableColumnVisibilityController} from "components/ui/Table/TableColumnVisibilityController";
import {TableSearch} from "components/ui/Table/TableSearch";
import {TableSummary} from "components/ui/Table/TableSummary";
import {CellComponent, PaddedCell, ShowCellVal, cellFunc, useTableCells} from "components/ui/Table/table_cells";
import {NON_NULLABLE} from "components/utils/array_filter";
import {
  PartialAttributesSelection,
  attributesSelectionFromPartial,
  getUnknownFixedAttributes,
  isAttributeSelected,
} from "components/utils/attributes_selection";
import {delayedAccessor} from "components/utils/debounce";
import {isDEV} from "components/utils/dev_mode";
import {featureUseTrackers} from "components/utils/feature_use_trackers";
import {NUMBER_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {Modifiable} from "components/utils/modifiable";
import {intersects, objectRecursiveMerge} from "components/utils/object_util";
import {ToastMessages, toastError} from "components/utils/toast";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {getAllRowsExportIterator} from "data-access/memo-api/tquery/export";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {
  ColumnConfig,
  ExtraDataColumns,
  createTableRequestCreator,
  getDefaultColumnVisibility,
  tableHelper,
} from "data-access/memo-api/tquery/table";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {ColumnType, DataColumnSchema, DataItem, Sort, isDataColumn} from "data-access/memo-api/tquery/types";
import {
  Accessor,
  JSX,
  Show,
  Signal,
  VoidComponent,
  batch,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  untrack,
} from "solid-js";
import {Dynamic} from "solid-js/web";
import {DocsModalInfoIcon, DocsModalProps} from "../docs_modal";
import {title} from "../title";
import {TableColumnGroupSelect} from "./TableColumnGroupSelect";
import {TableExportButton} from "./TableExportButton";
import {TableFiltersClearButton} from "./TableFiltersClearButton";
import {TableSavedViewsManager} from "./TableSavedViewsManager";
import {ColumnGroup, ColumnGroupParam, ColumnGroupsCollector, ColumnGroupsSelection} from "./column_groups";
import {ExportCellFunc, useTableTextExportCells} from "./table_export_cells";
import {BoolFilterControl} from "./tquery_filters/BoolFilterControl";
import {DateTimeFilterControl} from "./tquery_filters/DateTimeFilterControl";
import {DictFilterControl} from "./tquery_filters/DictFilterControl";
import {DictListFilterControl} from "./tquery_filters/DictListFilterControl";
import {IntFilterControl} from "./tquery_filters/IntFilterControl";
import {TextualFilterControl} from "./tquery_filters/TextualFilterControl";
import {UuidFilterControl} from "./tquery_filters/UuidFilterControl";
import {FilterControl} from "./tquery_filters/types";

type _Directives = typeof title;

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    readonly tquery?: TQueryTableMeta<TData>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    readonly tquery?: TQueryColumnMeta<TData>;
    readonly config?: FullColumnConfig<TData>;
  }
}

interface TQueryTableMeta<TData extends RowData> {
  /** Iterator over all the rows, for export purposes. */
  readonly allRowsExportIterable?: AllRowsExportIterable<TData>;
  readonly cellsPreviewMode?: Signal<CellsPreviewMode | undefined>;
  readonly columnGroups?: Accessor<readonly ColumnGroup[]>;
  readonly activeColumnGroups?: Signal<readonly string[]>;
  /**
   * The active column groups appropriate for the data currently shown in the table.
   * This is not updated with the changed active column groups until the new data is fetched.
   */
  readonly effectiveActiveColumnGroups?: Accessor<readonly string[]>;
}

/** The preview mode, changing the contents of all cells in the table to a preview value. */
export type CellsPreviewMode = "textExport";

export type AllRowsExportIterable<TData extends RowData = RowData> = AsyncIterable<TData> & {readonly length?: number};

export interface ColumnMetaParams<TData = DataItem> {
  /**
   * Whether this column is a DEV column, i.e. an unconfigured column taken directly from tquery schema,
   * displayed only in DEV mode.
   */
  readonly devColumn?: boolean;
  readonly textExportCell?: ExportCellFunc<string | undefined, TData>;
  readonly groupingInfo?: Accessor<ColumnGroupingInfo>;
}

interface ColumnGroupingInfo {
  readonly isValid: boolean;
  readonly isCount: boolean;
  readonly isGrouping: boolean;
  readonly isGrouped: boolean;
  readonly isForceShown: boolean;
}

/** Type of tquery-related information in column meta. */
export type TQueryColumnMeta<TData = DataItem> = ColumnMetaParams<TData> & Partial<DataColumnSchema>;

export interface TQueryTableProps<TData = DataItem> {
  /**
   * Mode in which the table is displayed:
   * - standalone - the table is the main element on the page, typically displays many rows,
   *   header and footer are sticky.
   * - embedded - the table is displayed along with other elements in a page, typically with not
   *   many rows, without sticky elements.
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
  /** The definition of the columns in the table, in their correct order. */
  readonly columns: readonly PartialColumnConfigEntry<TData>[];
  readonly columnGroups?: ColumnGroupsSelection;
  /**
   * The filter that is always applied to the data, regardless of other filtering.
   * This is used to create e.g. a table of entities A on the details page of a particular
   * entity B, so only entities A related directly to that particular entity B should be shown.
   */
  readonly intrinsicFilter?: FilterH;
  /** The sort that is always applied to the data at the end of the filter specified by the user. */
  readonly intrinsicSort?: Sort;
  readonly initialSort?: SortingState;
  readonly initialColumnGroups?: readonly string[];
  readonly initialPageSize?: number;
  /** Element to put below table, after the summary. */
  readonly customSectionBelowTable?: JSX.Element;
  readonly staticExportConfig?: TableExportConfig;
  readonly pageInfo?: DocsModalProps;
  /** Whether to allow saving table views. */
  readonly savedViews?: boolean;
}

export interface PartialColumnConfig<TData = DataItem> {
  readonly attributeColumns?: undefined;
  /** The name (id) of the column. */
  readonly name: string;
  /**
   * Whether this column has a corresponding tquery column (with the same name) that it shows.
   * Default: true.
   */
  readonly isDataColumn?: boolean;
  /** Additional columns from the tquery row that are used to construct the displayed value. */
  readonly extraDataColumns?: ExtraDataColumns | ExtraDataColumns["standard"];
  /**
   * The TanStack column definition. If isDataColumn, the tquery column is displayed by
   * default. Otherwise, columnDef needs to be specified to display anything.
   * All additional data columns used in columnDef.cell needs to be specified in extraDataColumns.
   */
  readonly columnDef?: IdentifiedColumnDef<TData>;
  /** The component that represents the column filter. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly filterControl?: FilterControl<any>;
  /** Override for the column header. */
  readonly header?: VoidComponent<HeaderParams<TData>>;
  /** Some meta params for the column. They are merged into columnDef.meta.tquery (this is a shorthand). */
  readonly metaParams?: ColumnMetaParams<TData>;
  /** The initial column visibility. Default: true. */
  readonly initialVisible?: boolean;
  /** Whether the column visibility should be saved across visits. Default: true. */
  readonly persistVisibility?: boolean;
  /** Whether the global filter can match this column. Default: depends on the column type. */
  readonly globalFilterable?: boolean;
  readonly columnGroups?: ColumnGroupParam;
}

interface HeaderParams<TData = DataItem> {
  readonly ctx: HeaderContext<TData, unknown>;
  readonly filter?: Signal<FilterH | undefined>;
  readonly filterControl?: () => JSX.Element;
}

/**
 * The entry denoting a collection of attribute columns. It includes all the non-fixed columns, plus possibly
 * fixed attribute columns, depending on the configuration.
 */
export interface AttributeColumnsConfig<TData = DataItem> {
  readonly attributeColumns: true;
  readonly defaultConfig?: Pick<PartialColumnConfig<TData>, "initialVisible" | "globalFilterable" | "columnGroups">;
  readonly selection: PartialAttributesSelection<Partial<PartialColumnConfig<TData>>>;
}

export type PartialColumnConfigEntry<TData = DataItem> = PartialColumnConfig<TData> | AttributeColumnsConfig<TData>;

type FullColumnConfig<TData = DataItem> = ColumnConfig &
  Required<Pick<PartialColumnConfig<TData>, "isDataColumn" | "columnDef" | "header" | "persistVisibility">> &
  Pick<PartialColumnConfig<TData>, "filterControl" | "metaParams">;

const DEFAULT_STANDALONE_PAGE_SIZE = 50;
const DEFAULT_EMBEDDED_PAGE_SIZE = 10;

const SUPPORTED_TRANSFORMS: ReadonlySet<string> = new Set(["count"]);

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TQueryTable: VoidComponent<TQueryTableProps<any>> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const featureFilterPrefix = featureUseTrackers.fuzzyGlobalFilterColumnPrefix();
  const entityURL = props.staticEntityURL;
  // The attribute columns configs, mapped by the index in props.columns where they were defined.
  const [attributeColumnsConfigsMap, setAttributeColumnsConfigsMap] = createSignal<
    ReadonlyMap<number, readonly PartialColumnConfig<DataItem>[]>
  >(new Map());
  const [devColumnsConfig, setDevColumnsConfig] = createSignal<readonly PartialColumnConfig<DataItem>[]>([]);
  const columnsConfigAndColumnGroups = createMemo(() => {
    const columnGroupsCollector = new ColumnGroupsCollector();
    const columnsConfig = [
      ...props.columns.flatMap<PartialColumnConfig<DataItem>>((colEntry, index) =>
        colEntry.attributeColumns ? attributeColumnsConfigsMap().get(index) || [] : [colEntry],
      ),
      ...devColumnsConfig(),
    ].map(
      ({
        name,
        isDataColumn = true,
        extraDataColumns,
        columnDef = {},
        filterControl,
        header = Header,
        metaParams,
        persistVisibility = true,
        initialVisible = persistVisibility,
        globalFilterable = true,
        columnGroups,
      }) =>
        ({
          name,
          isDataColumn,
          extraDataColumns: extraDataColumns
            ? Array.isArray(extraDataColumns)
              ? {standard: extraDataColumns, whenGrouping: undefined}
              : extraDataColumns
            : undefined,
          columnDef,
          filterControl,
          header,
          metaParams,
          initialVisible,
          persistVisibility,
          globalFilterable,
          columnGroups: columnGroupsCollector.column(name, columnGroups),
          includeInTableView: {
            visibility: !metaParams?.devColumn && (columnDef.enableHiding ?? true),
            // At this point it's not certain whether the column is filterable or not, this will be
            // determined when the type arrives from schema. The final information can be obtained
            // from columnDef.meta.hasFilter.
            filter: !metaParams?.devColumn,
          },
        }) satisfies FullColumnConfig,
    );
    const columnGroups = columnGroupsCollector.getColumnGroups(props.columnGroups);
    return {columnsConfig, columnGroups};
  });
  const columnsConfig = () => columnsConfigAndColumnGroups().columnsConfig;
  const columnGroups = () => columnsConfigAndColumnGroups().columnGroups;

  const tableCells = useTableCells();
  const tableTextExportCells = useTableTextExportCells();
  const defaultColumnConfigByType = new Map<ColumnType, Partial<PartialColumnConfig<DataItem>>>()
    .set("bool", {
      columnDef: {cell: tableCells.bool(), size: 150},
      metaParams: {textExportCell: tableTextExportCells.bool()},
      filterControl: BoolFilterControl,
    })
    .set("date", {
      columnDef: {cell: tableCells.date()},
      metaParams: {textExportCell: tableTextExportCells.date()},
      filterControl: DateTimeFilterControl,
    })
    .set("datetime", {
      columnDef: {cell: tableCells.datetime()},
      metaParams: {textExportCell: tableTextExportCells.datetime()},
      filterControl: DateTimeFilterControl,
    })
    .set("int", {
      columnDef: {cell: tableCells.int(), size: 150},
      metaParams: {textExportCell: tableTextExportCells.int()},
      filterControl: IntFilterControl,
    })
    .set("list", {
      columnDef: {cell: tableCells.list(), enableSorting: false},
      metaParams: {textExportCell: tableTextExportCells.list()},
    })
    .set("object", {
      columnDef: {cell: tableCells.object(), enableSorting: false},
      metaParams: {textExportCell: tableTextExportCells.object()},
    })
    .set("string", {
      columnDef: {cell: tableCells.string()},
      metaParams: {textExportCell: tableTextExportCells.string()},
      filterControl: TextualFilterControl,
    })
    .set("string_list", {
      columnDef: {cell: tableCells.stringList(), enableSorting: false},
      metaParams: {textExportCell: tableTextExportCells.stringList()},
      filterControl: TextualFilterControl,
    })
    .set("text", {
      columnDef: {cell: tableCells.text(), enableSorting: false},
      metaParams: {textExportCell: tableTextExportCells.text()},
      filterControl: TextualFilterControl,
    })
    .set("uuid", {
      columnDef: {cell: tableCells.uuid(), enableSorting: false, size: 80},
      metaParams: {textExportCell: tableTextExportCells.uuid()},
      filterControl: UuidFilterControl,
    })
    .set("uuid_list", {
      columnDef: {cell: tableCells.uuidList(), enableSorting: false, size: 80},
      metaParams: {textExportCell: tableTextExportCells.uuidList()},
      // TODO: Implement filter control.
    })
    .set("dict", {
      columnDef: {cell: tableCells.dict()},
      metaParams: {textExportCell: tableTextExportCells.dict()},
      filterControl: DictFilterControl,
    })
    .set("dict_list", {
      columnDef: {cell: tableCells.dictList(), enableSorting: false, size: 270},
      metaParams: {textExportCell: tableTextExportCells.dictList()},
      filterControl: DictListFilterControl,
    });

  const [table, setTable] = createSignal<SolidTable<DataItem>>();
  const baseTranslations = props.staticTranslations || createTableTranslations("generic");
  const translations: TableTranslations = {
    ...baseTranslations,
    columnName: (column, o) => {
      if (column === countColumn()) {
        const override = baseTranslations.countColumnLabelOverride(effectiveActiveColumnGroups(), o);
        return override
          ? t("tables.column_groups.count_column_label.with_override", {...o, override})
          : t("tables.column_groups.count_column_label");
      }
      const meta = table()?.getColumn(column)?.columnDef.meta?.tquery;
      const attributeId = meta?.attributeId;
      if (attributeId) {
        let attributeLabel = attributeId ? attributes()?.getById(attributeId).label : undefined;
        if (meta.transform) {
          attributeLabel = t(`tables.transforms.${meta.transform}`, {
            base: attributeLabel,
            defaultValue: `${attributeLabel}.${meta.transform}`,
          });
        }
        return baseTranslations.columnNameOverride
          ? baseTranslations.columnNameOverride(column, {defaultValue: attributeLabel || ""})
          : attributeLabel || "";
      }
      return baseTranslations.columnName(column, o);
    },
  };
  const requestCreator = createTableRequestCreator({
    columnsConfig,
    columnGroups,
    intrinsicFilter: () => props.intrinsicFilter,
    intrinsicSort: () => props.intrinsicSort,
    initialSort: props.initialSort,
    initialColumnGroups: props.initialColumnGroups,
    initialPageSize:
      props.initialPageSize ||
      // eslint-disable-next-line solid/reactivity
      (props.mode === "standalone" ? DEFAULT_STANDALONE_PAGE_SIZE : DEFAULT_EMBEDDED_PAGE_SIZE),
    columnsByPrefix: translations.columnsByPrefix,
    onColumnPrefixFilterUsed: (prefix) =>
      featureFilterPrefix.justUsed({comp: "table", model: translations.tableName(), prefix}),
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
  const {
    columnVisibility,
    globalFilter,
    getColumnFilter,
    columnsWithActiveFilters,
    clearColumnFilters,
    sorting,
    pagination,
    activeColumnGroups,
    countColumn,
    miniState,
    resetMiniState,
    defaultTableView,
    getCompleteTableView,
    loadTableView,
  } = requestController;
  let persistencesCreated = false;
  createComputed(() => {
    const sch = schema();
    if (sch && attributes()) {
      batch(() => {
        const configuredColumns = new Set();
        const foundAttributeColumnsConfigs = props.columns
          .map((colEntry, index) => {
            if (colEntry.attributeColumns) {
              return [index, colEntry] as const;
            } else {
              configuredColumns.add(colEntry.name);
              return undefined;
            }
          })
          .filter(NON_NULLABLE);
        const attributeColumnsConfigsMap = new Map<number, readonly PartialColumnConfig<DataItem>[]>();
        for (const [index, foundAttributeColumnsConfig] of foundAttributeColumnsConfigs) {
          const selection = attributesSelectionFromPartial(foundAttributeColumnsConfig.selection);
          const unknownFixedAttributes = getUnknownFixedAttributes(
            selection,
            sch.columns
              .map((col) => (isDataColumn(col) && col.attributeId ? attributes()!.getById(col.attributeId) : undefined))
              .filter(NON_NULLABLE),
          );
          if (unknownFixedAttributes) {
            console.error(`Unknown fixed attributes: ${unknownFixedAttributes.join(", ")}`);
          }
          attributeColumnsConfigsMap.set(
            index,
            sch.columns
              .map((col) => {
                if (!isDataColumn(col) || !col.attributeId) {
                  return undefined;
                }
                if (col.transform && !SUPPORTED_TRANSFORMS.has(col.transform)) {
                  console.warn(`Unknown column transform on attribute column ${col.name}: ${col.transform}`);
                  return undefined;
                }
                const attribute = attributes()!.getById(col.attributeId);
                const select = isAttributeSelected(selection, attribute, col.transform);
                if (select) {
                  if (configuredColumns.has(col.name)) {
                    if (select.explicit) {
                      throw new Error(
                        `Column ${col.name} is configured as a fixed attribute column, but it is configured statically as well.`,
                      );
                    }
                    return undefined;
                  }
                  return {
                    name: col.name,
                    ...foundAttributeColumnsConfig?.defaultConfig,
                    ...select.override,
                  };
                } else {
                  return undefined;
                }
              })
              .filter(NON_NULLABLE),
          );
        }
        setAttributeColumnsConfigsMap(attributeColumnsConfigsMap);
        if (isDEV()) {
          for (const attributeColumnsConfig of attributeColumnsConfigsMap.values()) {
            for (const col of attributeColumnsConfig) {
              configuredColumns.add(col.name);
            }
          }
          setDevColumnsConfig(
            sch.columns
              .filter((col) => isDataColumn(col) && !configuredColumns.has(col.name))
              .map((col) => ({
                name: col.name,
                metaParams: {devColumn: true},
                initialVisible: false,
                globalFilterable: false,
              })),
          );
        } else {
          setDevColumnsConfig([]);
        }
      });
      // Create the persistences, but make sure it is only done once, and doesn't cause this block to run again.
      if (!persistencesCreated) {
        persistencesCreated = true;
        untrack(() => {
          if (props.staticPersistenceKey) {
            // eslint-disable-next-line solid/reactivity
            const columnSizing = delayedAccessor(() => table()?.getState().columnSizing, {timeMs: 500});
            createPersistence<PersistentState>({
              storage: localStorageStorage(`TQueryTable:${props.staticPersistenceKey}`),
              value: () => ({
                colVis: columnVisibility[0](),
                colSize: columnSizing() || {},
              }),
              onLoad: (value) => {
                // Ensure a bad (e.g. outdated) entry won't affect visibility of a column that cannot have
                // the visibility controlled by the user. Leave alone unknown columns, they might exist in
                // a different context, e.g. in a different facility.
                const colVis = {...value.colVis};
                for (const colName of Object.keys(colVis)) {
                  const col = columnsConfig().find((c) => c.name === colName);
                  if (col) {
                    if (col.columnDef.enableHiding === false) {
                      delete colVis[colName];
                    } else if (!col.persistVisibility) {
                      colVis[colName] = col.initialVisible;
                    }
                  }
                }
                columnVisibility[1](colVis);
                onMount(() => table()!.setColumnSizing(value.colSize || {}));
              },
              version: [PERSISTENCE_VERSION],
            });
          }
          createHistoryPersistence({
            key: `TQueryTable:${props.staticPersistenceKey || "main"}`,
            value: () => ({
              tquery: miniState[0](),
            }),
            onLoad: (state) => {
              miniState[1](state.tquery);
            },
            onReset: () => {
              resetMiniState();
            },
          });
          // Allow querying data now that the DEV columns are added and columns visibility is loaded.
          setAllInitialised(true);
        });
      }
    }
  });
  const [effectiveActiveColumnGroups, setEffectiveActiveColumnGroups] = createSignal<readonly string[]>([]);
  createEffect(() => {
    if (dataQuery.isSuccess && !dataQuery.isPlaceholderData) {
      setEffectiveActiveColumnGroups(activeColumnGroups[0]());
    }
  });
  const {rowsCount, pageCount, scrollToTopSignal, filterErrors} = tableHelper({
    requestController,
    dataQuery,
    translations,
  });
  createEffect(() => {
    // Return to the first page if the current page is empty but the table is probably not.
    if (
      !dataQuery.isFetching &&
      !dataQuery.data?.data.length &&
      dataQuery.data?.meta.totalDataSize &&
      pagination[0]().pageIndex
    )
      pagination[1]((v) => ({...v, pageIndex: 0}));
  });
  createEffect(() => {
    const errors = filterErrors()?.values();
    if (errors) {
      // Make the messages non-reactive so that they are not changed while the toast is shown.
      const messages = [...errors];
      // TODO: Consider showing the errors in the table header.
      toastError(() => <ToastMessages messages={messages} />);
    }
  });
  const defaultColumnVisibility = createMemo(() => getDefaultColumnVisibility(columnsConfig()));

  // Avoid a dependency cycle between columnsReady and columns.
  const [columnsReady, setColumnsReady] = createSignal(false);
  const columnGroupingInfos = createMemo<ReadonlyMap<string, ColumnGroupingInfo>>(() => {
    const infos = new Map<string, Modifiable<ColumnGroupingInfo>>();
    if (columnsReady()) {
      for (const col of columns()) {
        infos.set(col.id!, {
          isValid: true,
          isCount: col.id === countColumn(),
          isGrouping: false,
          isGrouped: false,
          isForceShown: false,
        });
      }
      const activeColumnGroups = effectiveActiveColumnGroups();
      if (activeColumnGroups.length) {
        for (const group of columnGroups()) {
          if (activeColumnGroups.includes(group.name)) {
            for (const col of group.columns) {
              infos.get(col)!.isGrouping = true;
            }
            for (const col of group.forceShowColumns) {
              infos.get(col)!.isForceShown = true;
            }
          }
        }
        for (const info of infos.values()) {
          info.isGrouped = !info.isGrouping && !info.isCount;
        }
      }
    }
    return infos;
  });
  const INVALID_COLUMN_GROUPING_INFO: ColumnGroupingInfo = {
    isValid: false,
    isCount: false,
    isGrouping: false,
    isGrouped: false,
    isForceShown: false,
  };
  const [cellsPreviewMode, setCellsPreviewMode] = createSignal<CellsPreviewMode | undefined>();
  const columns = createMemo(() => {
    const sch = schema();
    if (!sch) {
      return [];
    }
    const columns = columnsConfig().map((col) => {
      let schemaCol: DataColumnSchema | undefined = undefined;
      if (col.isDataColumn) {
        const schemaColumn = sch.columns.find(({name}) => name === col.name);
        if (!schemaColumn) {
          throw new Error(`Column ${col.name} not found in schema`);
        }
        if (schemaColumn.type === "count") {
          throw new Error(`Column ${col.name} is a count column`);
        }
        schemaCol = schemaColumn;
      }
      const defColumnConfig = (schemaCol && defaultColumnConfigByType.get(schemaCol.type)) || {};
      const filterControl = col.filterControl || defColumnConfig.filterControl;
      const filter = getColumnFilter(col.name);
      const columnDef = objectRecursiveMerge<ColumnDef<DataItem, unknown>>(
        {
          id: col.name,
          accessorFn: col.isDataColumn ? (originalRow) => originalRow[col.name] : undefined,
          header: (ctx) => (
            <Dynamic
              component={col.header || defColumnConfig.header}
              ctx={ctx}
              filter={filter}
              filterControl={
                schemaCol &&
                filterControl &&
                (() => (
                  <Dynamic
                    component={filterControl}
                    column={ctx.column}
                    schema={schemaCol!}
                    filter={filter[0]()}
                    setFilter={filter[1]}
                  />
                ))
              }
            />
          ),
        },
        // It would be ideal to restrict the cell function to only accessing the data columns declared
        // by the column config, but there is no easy way to do this. The whole row is a store and cannot
        // be mutated, and wrapping it would be complicated.
        defColumnConfig.columnDef,
        col.columnDef,
        {
          enableColumnFilter:
            (defColumnConfig.columnDef?.enableColumnFilter ?? col.columnDef.enableColumnFilter ?? true) &&
            !!filterControl,
        },
        {meta: {tquery: schemaCol, config: col}},
        {meta: {tquery: defColumnConfig.metaParams}},
        {meta: {tquery: col.metaParams}},
        {
          meta: {
            tquery: {
              groupingInfo: () => columnGroupingInfos().get(col.name) || INVALID_COLUMN_GROUPING_INFO,
            },
          },
        },
      ) satisfies ColumnDef<DataItem, unknown>;
      const origCell = columnDef.cell as CellComponent;
      const isGrouped = createMemo(
        () => effectiveActiveColumnGroups().length && !intersects(effectiveActiveColumnGroups(), col.columnGroups),
      );
      columnDef.cell = (ctx) => (
        <Show when={isGrouped()} fallback={origCell(ctx)}>
          <GroupedColumnCell
            count={countColumn() ? (ctx.row.original[countColumn()!] as number | undefined) : undefined}
          />
        </Show>
      );
      const previewMode = cellsPreviewMode();
      if (previewMode) {
        if (previewMode === "textExport") {
          columnDef.cell = (ctx) => (
            <PaddedCell class="whitespace-pre-wrap">
              {columnDef.meta?.tquery?.textExportCell?.({
                value: ctx.getValue(),
                row: ctx.row.original,
                column: ctx.column,
              })}
            </PaddedCell>
          );
        } else {
          return previewMode satisfies never;
        }
      }
      return columnDef;
    });
    const countCol = countColumn();
    if (countCol) {
      columns.unshift(
        objectRecursiveMerge<ColumnDef<DataItem, unknown>>(
          {
            id: countCol,
            accessorFn: (originalRow) => originalRow[countCol],
            header: (ctx) => <Header ctx={ctx} />,
            sortDescFirst: true,
            enableHiding: false,
          },
          defaultColumnConfigByType.get("int")!.columnDef,
          {
            cell: cellFunc<number>((props) => (
              <PaddedCell class="w-full text-right">
                <ShowCellVal v={props.v}>
                  {(v) => (
                    <span class="flex justify-between gap-1">
                      <span>{t("tables.column_groups.grouping_symbol")}</span>
                      <span>{NUMBER_FORMAT.format(v())}</span>
                    </span>
                  )}
                </ShowCellVal>
              </PaddedCell>
            )),
          },
        ),
      );
    }
    return columns;
  });
  setColumnsReady(true);
  createComputed(() => {
    const countCol = countColumn();
    if (countCol) {
      columnVisibility[1]({...columnVisibility[0](), [countCol]: effectiveActiveColumnGroups().length > 0});
    }
  });

  const GroupedColumnCell: VoidComponent<{readonly count?: number}> = (props) => {
    return (
      <div class="w-full h-full p-1">
        <div
          class="w-full h-full rounded bg-hover flex items-center justify-center text-memo-active cursor-default"
          use:title={[
            props.count === undefined
              ? t("tables.column_groups.grouped_column_tooltip.unknown_count")
              : t("tables.column_groups.grouped_column_tooltip.known_count", {
                  count: props.count,
                }),
            {delay: [800, undefined]},
          ]}
        >
          {t("tables.column_groups.grouping_symbol")}
        </div>
      </div>
    );
  };

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
        translations,
        defaultColumnVisibility,
        exportConfig: props.staticExportConfig,
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
          cellsPreviewMode: [cellsPreviewMode, setCellsPreviewMode],
          columnGroups,
          activeColumnGroups,
          effectiveActiveColumnGroups,
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
          <TableColumnGroupSelect />
          <TableColumnVisibilityController />
          <Show when={props.savedViews && props.staticPersistenceKey}>
            {(persistenceKey) => (
              <TableSavedViewsManager
                staticPersistenceKey={persistenceKey()}
                defaultTableView={defaultTableView()}
                getCurrentView={getCompleteTableView}
                onLoad={loadTableView}
              />
            )}
          </Show>
          <Show when={props.pageInfo}>
            {(pageInfo) => (
              <div class="flex items-center">
                <DocsModalInfoIcon title={t("tables.more_info")} {...pageInfo()} />
              </div>
            )}
          </Show>
        </div>
      )}
      belowTable={() => (
        <div class="flex items-start justify-between gap-2 text-base flex-wrap">
          <div class="min-h-small-input flex items-stretch gap-2">
            <Pagination />
            <Show when={!dataQuery.isFetching || rowsCount()}>
              <TableSummary rowsCount={rowsCount()} />
              {props.customSectionBelowTable}
            </Show>
          </div>
          <div class="ml-auto">
            <TableExportButton />
          </div>
        </div>
      )}
      isLoading={!schema()}
      isDimmed={dataQuery.isFetching}
      scrollToTopSignal={scrollToTopSignal}
    />
  );
};
