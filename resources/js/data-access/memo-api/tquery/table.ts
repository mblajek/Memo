import {CreateQueryResult} from "@tanstack/solid-query";
import {PaginationState, SortingState, VisibilityState} from "@tanstack/solid-table";
import {AxiosError} from "axios";
import {TableTranslations} from "components/ui/Table";
import {ColumnGroup} from "components/ui/Table/column_groups";
import {FuzzyGlobalFilterConfig, buildFuzzyGlobalFilter} from "components/ui/Table/tquery_filters/fuzzy_filter";
import {NON_NULLABLE, useLangFunc} from "components/utils";
import {arraysEqual, intersects, objectsEqual} from "components/utils/object_util";
import {Accessor, Signal, batch, createComputed, createMemo, createSignal, on} from "solid-js";
import {useDictionaries} from "../dictionaries_and_attributes_context";
import {translateError} from "../error_util";
import {Api} from "../types";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {Column, ColumnName, DataRequest, DataResponse, Filter, Sort, SortItem} from "./types";

export interface ColumnConfig {
  readonly name: string;
  /** Whether this column has a corresponding tquery column (with the same name) that it shows. */
  readonly isDataColumn: boolean;
  readonly extraDataColumns: ExtraDataColumns | undefined;
  readonly initialVisible: boolean;
  /** Whether the global filter can match this column. Default: depends on the column type. */
  readonly globalFilterable: boolean;
  readonly columnGroups: readonly string[] | undefined;
}

/** The additional tquery data columns needed to construct this table column. */
export interface ExtraDataColumns {
  readonly standard: readonly ColumnName[];
  /**
   * The alternative list of extra columns, to be used instead of the standard list, if grouping by a
   * column group created from this column group (i.e. same name and isFromColumn set).
   * This should typically be a subset of the standard list.
   * Default: same as standard.
   */
  readonly whenGrouping: readonly ColumnName[] | undefined;
}

/** A collection of column filters, keyed by column name. The undefined value denotes a disabled filter. */
export type ColumnFilters = Readonly<Record<ColumnName, Signal<FilterH | undefined>>>;

interface RequestController {
  readonly columnVisibility: Signal<VisibilityState>;
  readonly globalFilter: Signal<string>;
  readonly getColumnFilter: (column: ColumnName) => Signal<FilterH | undefined>;
  readonly columnsWithActiveFilters: Accessor<readonly string[]>;
  readonly clearColumnFilters: () => void;
  readonly sorting: Signal<SortingState>;
  readonly pagination: Signal<PaginationState>;
  readonly activeColumnGroups: Signal<readonly string[]>;
  readonly countColumn: Accessor<ColumnName | undefined>;
  readonly miniState: [Accessor<MiniState>, (state: MiniState) => void];
}

/**
 * The state of the table, related to the filtering, sorting and pagination. It is typically not persisted across sessions.
 * The column filters are stored separately for technical reasons.
 */
export interface MiniState {
  readonly globalFilter: string;
  readonly columnFilters: ReadonlyMap<string, FilterH | undefined>;
  readonly sorting: SortingState;
  readonly pagination: PaginationState;
  readonly activeColumnGroups: readonly string[];
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Creates a request creator with a collection of helpers to use together with a TanStack Table.
 *
 * The request itself is a memo combining data from the signals exposed in the RequestController.
 * These signals can be plugged directly into the table state.
 *
 * The allInitialised signal can be used to delay execution of the query if some more externa initialisation
 * is needed.
 */
export function createTableRequestCreator({
  columnsConfig,
  columnGroups,
  intrinsicFilter = () => undefined,
  intrinsicSort = () => undefined,
  initialSort = [],
  initialPageSize = DEFAULT_PAGE_SIZE,
}: {
  columnsConfig: Accessor<readonly ColumnConfig[]>;
  columnGroups?: Accessor<readonly ColumnGroup[] | undefined>;
  intrinsicFilter?: Accessor<FilterH | undefined>;
  intrinsicSort?: Accessor<Sort | undefined>;
  initialSort?: SortingState;
  initialPageSize?: number;
}): RequestCreator<RequestController> {
  const dictionaries = useDictionaries();
  const columnsConfigByName = createMemo(() => {
    const map = new Map<string, ColumnConfig>();
    for (const col of columnsConfig()) {
      map.set(col.name, col);
    }
    return map;
  });
  const columnGroupsByName = createMemo(() => {
    const map = new Map<string, ColumnGroup>();
    for (const group of columnGroups?.() || []) {
      map.set(group.name, group);
    }
    return map;
  });
  return (schema) => {
    const [allInitialisedInternal, setAllInitialisedInternal] = createSignal(false);
    const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>(
      {},
      {equals: (a, b) => objectsEqual(a, b)},
    );
    const [globalFilter, setGlobalFilter] = createSignal<string>("");
    const [columnFilters, setColumnFilters] = createSignal<ColumnFilters>({});
    const [sorting, setSorting] = createSignal<SortingState>(initialSort, {
      equals: (a, b) => arraysEqual(a, b, (ai, bi) => ai.id === bi.id && ai.desc === bi.desc),
    });
    const [pagination, setPagination] = createSignal<PaginationState>({pageIndex: 0, pageSize: initialPageSize});
    const [activeColumnGroups, setActiveColumnGroups] = createSignal<readonly string[]>([]);
    function getColumnFilter(column: ColumnName) {
      let signal = columnFilters()[column];
      if (!signal) {
        const [get, set] = createSignal<FilterH>();
        signal = [get, set];
        setColumnFilters({...columnFilters(), [column]: signal});
      }
      return signal;
    }
    const columnsWithActiveFilters = () =>
      Object.entries(columnFilters())
        .map(([column, filter]) => filter[0]() && column)
        .filter(NON_NULLABLE);
    function clearColumnFilters() {
      batch(() => {
        for (const signal of Object.values(columnFilters())) {
          signal[1](undefined);
        }
      });
    }
    const defaultColumnVisibility = () => getDefaultColumnVisibility(columnsConfig());
    // Initialise the request parts based on the config.
    createComputed(() => {
      setColumnVisibility((vis) => ({...defaultColumnVisibility(), ...vis}));
      // Don't try sorting by non-existent columns.
      setSorting((sorting) => sorting.filter((sort) => columnsConfigByName().has(sort.id)));
      setAllInitialisedInternal(true);
    });
    const countColumn = createMemo(() => schema()?.columns.find((c) => c.type === "count")?.name);
    const groupingActive = () => activeColumnGroups().length > 0;
    createComputed(() => {
      if (groupingActive())
        // Show the force-show columns.
        setColumnVisibility((vis) => {
          vis = {...vis};
          for (const group of activeColumnGroups()) {
            for (const forceShowCol of columnGroupsByName().get(group)?.forceShowColumns || []) {
              vis[forceShowCol] = true;
            }
          }
          return vis;
        });
      // Remove column filters for hidden columns.
      for (const {name} of columnsConfig()) {
        if (columnVisibility()[name] === false) {
          columnFilters()[name]?.[1](undefined);
        }
      }
    });
    /**
     * Returns whether the data column is valid in the context of the current grouping.
     * The count column is only valid when grouping, and when grouping, only columns belonging to any group are valid).
     */
    function isDataColumnValid(sortColumn: ColumnName) {
      const activeGroups = activeColumnGroups();
      return activeGroups.length
        ? intersects(columnsConfigByName().get(sortColumn)?.columnGroups, activeGroups) || sortColumn === countColumn()
        : sortColumn !== countColumn();
    }
    createComputed(() => setSorting(sorting().filter(({id}) => isDataColumnValid(id))));
    const filterReductor = createMemo(on(schema, (schema) => schema && new FilterReductor(schema)));
    /** The primary sort column, wrapped in memo to detect actual changes. */
    const mainSort = createMemo(() => sorting()[0]);
    /** The column filters joined. This intermediate step is helpful for resetting pagination. */
    const columnFiltersJoined = createMemo<FilterH>(() => ({
      type: "op",
      op: "&",
      val: Object.values(columnFilters())
        .map(([get]) => get())
        .filter(NON_NULLABLE),
    }));
    /**
     * Whether to go back to the first page on significant data changes. This is normally set, but is
     * disabled when restoring the state from the history.
     */
    let goToFirstPageOnChanges = true;
    createComputed(
      on([globalFilter, columnFiltersJoined, mainSort], () => {
        if (goToFirstPageOnChanges) {
          setPagination((prev) => ({...prev, pageIndex: 0}));
        }
      }),
    );
    const dataColumns = createMemo(() => {
      const activeGroups = activeColumnGroups();
      const tableColumns = new Set<string>();
      for (const col of columnsConfig())
        if (
          columnVisibility()[col.name] !== false &&
          (!activeGroups.length || intersects(col.columnGroups, activeGroups))
        )
          tableColumns.add(col.name);
      for (const group of activeGroups) {
        const groupConfig = columnGroupsByName().get(group);
        if (groupConfig) {
          for (const column of groupConfig.forceShowColumns) {
            tableColumns.add(column);
          }
          for (const column of groupConfig.forceGroupByColumns) {
            tableColumns.add(column);
          }
        }
      }
      const dataColumns = new Set<string>();
      for (const tableColumn of tableColumns) {
        const {name, isDataColumn, extraDataColumns} = columnsConfigByName().get(tableColumn)!;
        if (isDataColumn) {
          dataColumns.add(name);
        }
        if (extraDataColumns) {
          const extraDataCols =
            extraDataColumns.whenGrouping && columnGroupsByName().get(name)?.isFromColumn && activeGroups.includes(name)
              ? extraDataColumns.whenGrouping
              : extraDataColumns.standard;
          for (const col of extraDataCols) {
            dataColumns.add(col);
          }
        }
      }
      if (activeGroups.length && countColumn()) {
        dataColumns.add(countColumn()!);
      }
      return [...dataColumns].sort().map<Column>((column) => ({type: "column", column}));
    });
    const fuzzyGlobalFilterConfig = createMemo(() => {
      const sch = schema();
      if (!sch) {
        return undefined;
      }
      return {
        schema: sch,
        dictionaries: dictionaries(),
        columns: columnsConfig()
          .filter(({isDataColumn, globalFilterable}) => isDataColumn && globalFilterable)
          .map(({name}) => name),
        // TODO: Add columnsByPrefix for some columns, e.g. tel:, id= (for short code).
      } satisfies FuzzyGlobalFilterConfig;
    });
    const request = createMemo((): DataRequest | undefined => {
      if (!allInitialisedInternal() || !dataColumns().length) {
        return undefined;
      }
      const allSort: SortItem[] = sorting().map(({id, desc}) => ({
        type: "column",
        column: id,
        desc,
      }));
      const intrinsicSortToApply = intrinsicSort()?.filter((sortItem) => {
        if (sortItem.type === "column" && allSort.some((s) => s.type === "column" && s.column === sortItem.column)) {
          // Skip repeated columns.
          return false;
        }
        return true;
      });
      for (const sortItem of intrinsicSortToApply || []) {
        if (sortItem.type === "column" && allSort.some((s) => s.type === "column" && s.column === sortItem.column)) {
          continue;
        }
        allSort.push(sortItem);
      }
      // Filter out the possible occurrences of invalid sort. It can occur in the sort if it was not yet removed by
      // createComputed, or in the intrinsic sort.
      const sort = allSort.filter((sort) => (sort.type === "column" ? isDataColumnValid(sort.column) : true));
      return {
        columns: dataColumns(),
        filter:
          filterReductor()?.reduce({
            type: "op",
            op: "&",
            val: [
              intrinsicFilter(),
              buildFuzzyGlobalFilter(globalFilter(), fuzzyGlobalFilterConfig()!),
              columnFiltersJoined(),
            ].filter(NON_NULLABLE),
          }) || "always",
        distinct: groupingActive(),
        sort,
        paging: {
          number: pagination().pageIndex + 1,
          size: pagination().pageSize,
        },
      };
    });
    const miniState = () =>
      ({
        globalFilter: globalFilter(),
        columnFilters: new Map(Object.entries(columnFilters()).map(([k, v]) => [k, v[0]()])),
        sorting: sorting(),
        pagination: pagination(),
        activeColumnGroups: activeColumnGroups(),
      }) satisfies MiniState;
    function setMiniState(state: MiniState) {
      goToFirstPageOnChanges = false;
      batch(() => {
        setGlobalFilter(state.globalFilter);
        for (const [column, filter] of state.columnFilters) {
          getColumnFilter(column)[1](filter);
        }
        setSorting(state.sorting);
        setPagination(state.pagination);
        setActiveColumnGroups(state.activeColumnGroups);
      });
      setTimeout(() => {
        goToFirstPageOnChanges = true;
      });
    }
    return {
      request,
      requestController: {
        columnVisibility: [columnVisibility, setColumnVisibility],
        globalFilter: [globalFilter, setGlobalFilter],
        getColumnFilter,
        columnsWithActiveFilters,
        clearColumnFilters,
        sorting: [sorting, setSorting],
        pagination: [pagination, setPagination],
        activeColumnGroups: [activeColumnGroups, setActiveColumnGroups],
        countColumn,
        miniState: [miniState, setMiniState],
      },
    };
  };
}

export function getDefaultColumnVisibility(columnsConfig: readonly ColumnConfig[]) {
  const columnVisibility: VisibilityState = {};
  for (const {name, initialVisible = true} of columnsConfig) {
    columnVisibility[name] = initialVisible;
  }
  return columnVisibility;
}

interface TableHelperInterface {
  rowsCount: Accessor<number | undefined>;
  pageCount: Accessor<number>;
  /** A signal that changes whenever the table needs to be scrolled back to top. */
  scrollToTopSignal: Accessor<unknown>;
  /**
   * A map of column filter errors resulting from bad input values, that the table
   * should display somewhere. The key is the column name, or `"?"` for error(s) that
   * could not be attributed to a specific column.
   */
  filterErrors: Accessor<Map<ColumnName | typeof UNRECOGNIZED_FIELD_KEY, string> | undefined>;
}

export const UNRECOGNIZED_FIELD_KEY = "?";

const FILTER_VAL_ERROR_REGEX = /^filter\.(|.+?\.)val$/;

/**
 * Checks whether the error is a validation error on a filter value. This kind of error is
 * typically caused by user entering e.g. bad regex or bad UUID, not by a bug.
 *
 * The filter val errors are not automatically displayed as toasts, but are instead handled
 * by the TQueryTable component (see tableHelper).
 */
export function isFilterValError(error: Api.Error): error is Api.ValidationError {
  return Api.isValidationError(error) && FILTER_VAL_ERROR_REGEX.test(error.field);
}

export function tableHelper({
  requestController,
  dataQuery,
  translations,
}: {
  requestController: RequestController;
  dataQuery: CreateQueryResult<DataResponse, AxiosError<Api.ErrorResponse>>;
  translations?: TableTranslations;
}): TableHelperInterface {
  const t = useLangFunc();
  const rowsCount = () => dataQuery.data?.meta.totalDataSize;
  const pageCount = createMemo(() =>
    Math.ceil(Math.max(rowsCount() || 0, 1) / requestController.pagination[0]().pageSize),
  );
  const scrollToTopSignal = () => requestController.pagination[0]().pageIndex;
  const filterErrors = createMemo(() => {
    if (!dataQuery.error) {
      return undefined;
    }
    const dataRequest: DataRequest = JSON.parse(dataQuery.error.config?.data || null);
    const filterErrors = new Map<ColumnName, string>();
    for (const e of dataQuery.error.response?.data.errors || []) {
      if (isFilterValError(e)) {
        // Other kinds of errors are already handled at a higher level.
        // Find the problematic filter. The value of e.field will be something like `filter.val.0.val`,
        // so traverse that path in the request object, minus the last `val` part.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let val: any = dataRequest;
        for (const part of e.field.split(".").slice(0, -1)) {
          if (val && typeof val === "object") {
            val = val[part];
          } else {
            break;
          }
        }
        if (val && typeof val === "object") {
          const leafFilter: Filter = val;
          if (leafFilter.type === "column") {
            const translatedColumnName = translations?.columnName(leafFilter.column) || leafFilter.column;
            filterErrors.set(
              leafFilter.column,
              translateError({
                ...e,
                field: t("tables.filter.filter_for", {data: translatedColumnName}),
              }),
            );
            continue;
          }
        }
        // The correct leaf column filter could not be determined. Just put the error in the `"?"` key.
        filterErrors.set(
          UNRECOGNIZED_FIELD_KEY,
          [filterErrors.get(UNRECOGNIZED_FIELD_KEY), translateError(e)].filter(NON_NULLABLE).join("\n"),
        );
      }
    }
    return filterErrors.size ? filterErrors : undefined;
  });
  return {
    rowsCount,
    pageCount,
    scrollToTopSignal,
    filterErrors,
  };
}
