import {PaginationState, SortingState, VisibilityState} from "@tanstack/solid-table";
import {buildFuzzyGlobalFilter} from "components/ui";
import {NON_NULLABLE, debouncedFilterTextAccessor} from "components/utils";
import {Accessor, Signal, createComputed, createMemo, createSignal, on} from "solid-js";
import {SetStoreFunction, Store, createStore} from "solid-js/store";
import {Column, ColumnName, DataRequest, DataResponse, Filter, RequestCreator, Schema} from ".";

/** A collection of column filters, keyed by column name. */
export type ColumnFilters = Partial<Record<ColumnName, Filter | undefined>>;

interface RequestController {
  columnVisibility: Signal<VisibilityState>;
  globalFilter: Signal<string>;
  debouncedGlobalFilter: Accessor<string>;
  columnFilters: [Store<ColumnFilters>, SetStoreFunction<ColumnFilters>];
  sorting: Signal<SortingState>;
  pagination: Signal<PaginationState>;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Returns visibility state with visibility of all the columns set explicitly to the given value.
 */
function allColumnsVisibility(schema: Schema, additionalColumns: string[], {visible = true} = {}) {
  const visibility: VisibilityState = {};
  for (const {name} of schema.columns) {
    visibility[name] = visible;
  }
  for (const name of additionalColumns) {
    visibility[name] = visible;
  }
  return visibility;
}

/**
 * Creates a requets creator with a collection of helpers to use together with a TanStack Table.
 *
 * The request itself is a memo combining data from the signals exposed in the RequestController.
 * These signals can be plugged directly into the table state.
 */
export function createTableRequestCreator({
  intrinsicFilter = () => undefined,
  additionalColumns = [],
  initialVisibleColumns,
  initialSort = [],
  initialPageSize = DEFAULT_PAGE_SIZE,
}: {
  intrinsicFilter?: Accessor<Filter | undefined>;
  additionalColumns?: string[];
  initialVisibleColumns?: string[];
  initialSort?: SortingState;
  initialPageSize?: number;
}): RequestCreator<RequestController> {
  return (schema) => {
    const [allInited, setAllInited] = createSignal(false);
    const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({});
    const [globalFilter, setGlobalFilter] = createSignal<string>("");
    const [columnFilters, setColumnFilters] = createStore<ColumnFilters>({});
    const [sorting, setSorting] = createSignal<SortingState>(initialSort);
    const [pagination, setPagination] = createSignal<PaginationState>({pageIndex: 0, pageSize: initialPageSize});
    // eslint-disable-next-line solid/reactivity
    const debouncedGlobalFilter = debouncedFilterTextAccessor(globalFilter);
    // Initialise the request parts based on the schema.
    createComputed(
      on(schema, (schema) => {
        if (schema) {
          let visibility: VisibilityState;
          if (initialVisibleColumns) {
            visibility = allColumnsVisibility(schema, additionalColumns, {visible: false});
            for (const name of initialVisibleColumns) {
              visibility[name] = true;
            }
          } else {
            visibility = allColumnsVisibility(schema, additionalColumns);
          }
          setColumnVisibility(visibility);
          setColumnFilters({});
          for (const {name} of schema.columns) {
            setColumnFilters(name, undefined);
          }
          setAllInited(true);
        }
      }),
    );
    createComputed(
      on([schema, columnVisibility], ([schema, columnVisibility], prev) => {
        if (schema) {
          // Don't allow hiding all the columns.
          if (!Object.values(columnVisibility).some((v) => v)) {
            const prevColumnVisibility = prev?.[1];
            // Revert to the previous visibility state if possible, otherwise show all columns.
            setColumnVisibility(
              prevColumnVisibility && Object.values(prevColumnVisibility).some((v) => v)
                ? prevColumnVisibility
                : allColumnsVisibility(schema, additionalColumns),
            );
          }
          // Remove column filters for hidden columns.
          for (const {name} of schema.columns) {
            if (columnVisibility[name] === false) {
              setColumnFilters(name, undefined);
            }
          }
        }
      }),
    );
    /** The primary sort column, wrapped in memo to detect actual changes. */
    const mainSort = createMemo(() => sorting()[0]);
    /**
     * Array of column filters. This intermediate step is helpful because on() cannot track
     * the whole column filters store.
     */
    const columnFiltersJoined: Accessor<Filter[]> = createMemo(
      () =>
        schema()
          ?.columns.map(({name}) => columnFilters[name])
          .filter(NON_NULLABLE)
          .map((filter) => ({...filter})) || [],
    );
    // Go back to the first page on significant data changes.
    createComputed(
      on([debouncedGlobalFilter, columnFiltersJoined, mainSort], () => {
        setPagination((prev) => ({...prev, pageIndex: 0}));
      }),
    );
    const request = createMemo<DataRequest | undefined>(
      on(
        [
          intrinsicFilter,
          schema,
          allInited,
          columnVisibility,
          debouncedGlobalFilter,
          columnFiltersJoined,
          sorting,
          pagination,
        ],
        ([
          intrinsicFilter,
          schema,
          allInited,
          columnVisibility,
          globalFilter,
          columnFiltersJoined,
          sorting,
          pagination,
        ]) => {
          if (!schema || !allInited) {
            return undefined;
          }
          const request: DataRequest = {
            columns: schema.columns
              .map<Column | undefined>(({name}) =>
                columnVisibility[name] === false ? undefined : {type: "column", column: name},
              )
              .filter(NON_NULLABLE),
            filter: {
              type: "op",
              op: "&",
              val: [intrinsicFilter, buildFuzzyGlobalFilter(globalFilter), ...columnFiltersJoined].filter(NON_NULLABLE),
            },
            sort: sorting.map(({id, desc}) => ({
              type: "column",
              column: id,
              dir: desc ? "desc" : "asc",
            })),
            paging: pagination,
          };
          return request;
        },
      ),
    );
    return {
      request,
      requestController: {
        columnVisibility: [columnVisibility, setColumnVisibility],
        globalFilter: [globalFilter, setGlobalFilter],
        debouncedGlobalFilter,
        columnFilters: [columnFilters, setColumnFilters],
        sorting: [sorting, setSorting],
        pagination: [pagination, setPagination],
      } satisfies RequestController,
    };
  };
}

interface TableHelperInterface {
  rowsCount: Accessor<number | undefined>;
  pageCount: Accessor<number>;
  /** A signal that changes whenever the table needs to be scrolled back to top. */
  scrollToTopSignal: Accessor<unknown>;
}

export function tableHelper({
  requestController,
  response,
}: {
  requestController: RequestController;
  response: Accessor<DataResponse | undefined>;
}): TableHelperInterface {
  const rowsCount = () => response()?.meta.totalDataSize;
  const pageCount = createMemo(() =>
    Math.ceil(Math.max(rowsCount() || 0, 1) / requestController.pagination[0]().pageSize),
  );
  const scrollToTopSignal = () => requestController.pagination[0]().pageIndex;
  return {rowsCount, pageCount, scrollToTopSignal};
}
