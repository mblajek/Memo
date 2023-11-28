import {CreateQueryResult} from "@tanstack/solid-query";
import {PaginationState, SortingState, VisibilityState} from "@tanstack/solid-table";
import {AxiosError} from "axios";
import {TableTranslations} from "components/ui/Table";
import {FuzzyGlobalFilterConfig, buildFuzzyGlobalFilter} from "components/ui/Table/tquery_filters/fuzzy_filter";
import {NON_NULLABLE, debouncedFilterTextAccessor, useLangFunc} from "components/utils";
import {Accessor, Signal, createComputed, createMemo, createSignal, on} from "solid-js";
import {translateError} from "../error_util";
import {Api} from "../types";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {Column, ColumnName, DataRequest, DataResponse, Filter} from "./types";

export interface ColumnConfig {
  readonly name: string;
  /** A list of tquery columns needed to construct this column. */
  readonly dataColumns: readonly ColumnName[];
  readonly initialVisible: boolean;
}

/** A collection of column filters, keyed by column name. The undefined value denotes a disabled filter. */
export type ColumnFilters = Record<ColumnName, Signal<FilterH | undefined>>;

interface RequestController {
  readonly columnVisibility: Signal<VisibilityState>;
  readonly globalFilter: Signal<string>;
  readonly columnFilter: (column: ColumnName) => Signal<FilterH | undefined>;
  readonly sorting: Signal<SortingState>;
  readonly pagination: Signal<PaginationState>;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Creates a requets creator with a collection of helpers to use together with a TanStack Table.
 *
 * The request itself is a memo combining data from the signals exposed in the RequestController.
 * These signals can be plugged directly into the table state.
 */
export function createTableRequestCreator({
  columnsConfig,
  intrinsicFilter = () => undefined,
  initialSort = [],
  initialPageSize = DEFAULT_PAGE_SIZE,
}: {
  columnsConfig: Accessor<readonly ColumnConfig[]>;
  intrinsicFilter?: Accessor<FilterH | undefined>;
  initialSort?: SortingState;
  initialPageSize?: number;
}): RequestCreator<RequestController> {
  return (schema) => {
    const [allInited, setAllInited] = createSignal(false);
    const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({});
    const [globalFilter, setGlobalFilter] = createSignal<string>("");
    const [columnFilters, setColumnFilters] = createSignal<ColumnFilters>({});
    const [sorting, setSorting] = createSignal<SortingState>(initialSort);
    const [pagination, setPagination] = createSignal<PaginationState>({pageIndex: 0, pageSize: initialPageSize});
    // eslint-disable-next-line solid/reactivity
    const debouncedGlobalFilter = debouncedFilterTextAccessor(globalFilter);
    function columnFilter(column: ColumnName) {
      let signal = columnFilters()[column];
      if (!signal) {
        const [get, set] = createSignal<FilterH>();
        signal = [get, set];
        setColumnFilters({...columnFilters(), [column]: signal});
      }
      return signal;
    }
    // Initialise the request parts based on the config.
    createComputed(() => {
      setColumnVisibility((oldVis) => {
        const vis = {...oldVis};
        for (const {name, initialVisible = true} of columnsConfig()) {
          vis[name] = initialVisible;
        }
        return vis;
      });
      // Don't try sorting by non-existent columns.
      setSorting((sorting) => sorting.filter((sort) => columnsConfig().some(({name}) => name === sort.id)));
      setAllInited(true);
    });
    createComputed<VisibilityState>((prevColumnVisibility) => {
      // Don't allow hiding all the columns.
      if (!Object.values(columnVisibility()).some((v) => v)) {
        let restoredColumnVisibility = prevColumnVisibility;
        // Revert to the previous visibility state if possible, otherwise show all columns.
        if (!restoredColumnVisibility || !Object.values(restoredColumnVisibility).some((v) => v)) {
          restoredColumnVisibility = {};
          for (const {name} of columnsConfig()) {
            restoredColumnVisibility[name] = true;
          }
        }
        setColumnVisibility(restoredColumnVisibility);
      }
      // Remove column filters for hidden columns.
      for (const {name} of columnsConfig()) {
        if (columnVisibility()[name] === false) {
          columnFilters()[name]?.[1](undefined);
        }
      }
      return columnVisibility();
    });
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
    // Go back to the first page on significant data changes.
    createComputed(
      on([debouncedGlobalFilter, columnFiltersJoined, mainSort], () => {
        setPagination((prev) => ({...prev, pageIndex: 0}));
      }),
    );
    const dataColumns = createMemo(() =>
      [
        ...new Set(
          columnsConfig()
            .filter(({name}) => columnVisibility()[name] !== false)
            .flatMap(({dataColumns}) => dataColumns),
        ),
      ]
        .sort()
        .map<Column>((column) => ({type: "column", column})),
    );
    const fuzzyGlobalFilterConfig = createMemo(() => {
      const sch = schema();
      if (!sch) {
        return undefined;
      }
      return {
        columns: sch.columns.filter(({type}) => type === "string" || type === "text").map(({name}) => name),
        // TODO: Add columnsByPrefix for some columns, e.g. tel:, id= (for Versum ids).
      } satisfies FuzzyGlobalFilterConfig;
    });
    const request = createMemo((): DataRequest | undefined => {
      if (!allInited()) {
        return undefined;
      }
      return {
        columns: dataColumns(),
        filter: filterReductor()?.reduce({
          type: "op",
          op: "&",
          val: [
            intrinsicFilter(),
            buildFuzzyGlobalFilter(debouncedGlobalFilter(), fuzzyGlobalFilterConfig()!),
            columnFiltersJoined(),
          ].filter(NON_NULLABLE),
        }),
        sort: sorting().map(({id, desc}) => ({
          type: "column",
          column: id,
          desc,
        })),
        paging: {
          number: pagination().pageIndex + 1,
          size: pagination().pageSize,
        },
      };
    });
    return {
      request,
      requestController: {
        columnVisibility: [columnVisibility, setColumnVisibility],
        globalFilter: [globalFilter, setGlobalFilter],
        columnFilter,
        sorting: [sorting, setSorting],
        pagination: [pagination, setPagination],
      },
    };
  };
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
            const translatedColumnName = translations?.columnNames(leafFilter.column) || leafFilter.column;
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
