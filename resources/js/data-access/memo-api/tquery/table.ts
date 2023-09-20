import {PaginationState, SortingState, VisibilityState} from "@tanstack/solid-table";
import {buildFuzzyGlobalFilter} from "components/ui";
import {NON_NULLABLE, debouncedFilterTextAccessor} from "components/utils";
import {Accessor, Signal, createComputed, createMemo, createSignal, on} from "solid-js";
import {Column, ColumnName, DataRequest, DataResponse, FilterH, FilterReductor, RequestCreator, Schema} from ".";

/** A collection of column filters, keyed by column name. The undefined value denotes a disabled filter. */
export type ColumnFilters = Record<ColumnName, Signal<FilterH | undefined>>;

interface RequestController {
  columnVisibility: Signal<VisibilityState>;
  globalFilter: Signal<string>;
  debouncedGlobalFilter: Accessor<string>;
  columnFilter: (column: ColumnName) => Signal<FilterH | undefined>;
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
  intrinsicColumns = () => undefined,
  additionalColumns = [],
  initialVisibleColumns,
  initialSort = [],
  initialPageSize = DEFAULT_PAGE_SIZE,
}: {
  intrinsicFilter?: Accessor<FilterH | undefined>;
  intrinsicColumns?: Accessor<string[] | undefined>;
  additionalColumns?: string[];
  initialVisibleColumns?: string[];
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
          const colFilters: ColumnFilters = {};
          for (const {name} of schema.columns) {
            colFilters[name] = createSignal<FilterH>();
          }
          setColumnFilters(colFilters);
          // Don't try sorting by non-existent columns.
          setSorting((sorting) => sorting.filter((sort) => schema.columns.some((col) => col.name === sort.id)));
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
              columnFilters()[name]?.[1](undefined);
            }
          }
        }
      }),
    );
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
    const columns = createMemo(
      on([schema, intrinsicColumns, columnVisibility], ([schema, intrinsicColumns, columnVisibility]) => {
        if (!schema) {
          return [];
        }
        return [
          ...new Set([
            ...schema.columns.map(({name}) => name).filter((name) => columnVisibility[name] !== false),
            ...(intrinsicColumns || []),
          ]),
        ].map<Column>((column) => ({type: "column", column}));
      }),
    );
    const request = createMemo<DataRequest | undefined>(
      on(
        [intrinsicFilter, schema, allInited, columns, debouncedGlobalFilter, columnFiltersJoined, sorting, pagination],
        ([intrinsicFilter, schema, allInited, columns, globalFilter, columnFiltersJoined, sorting, pagination]) => {
          if (!schema || !allInited) {
            return undefined;
          }

          const f: FilterH = {
            type: "op",
            op: "&",
            val: [intrinsicFilter, buildFuzzyGlobalFilter(globalFilter), columnFiltersJoined].filter(NON_NULLABLE),
          };
          console.log(JSON.parse(JSON.stringify(f)));
          console.log(JSON.stringify(filterReductor()?.reduce(f)));

          const request: DataRequest = {
            columns,
            filter: filterReductor()?.reduce({
              type: "op",
              op: "&",
              val: [intrinsicFilter, buildFuzzyGlobalFilter(globalFilter), columnFiltersJoined].filter(NON_NULLABLE),
            }),
            sort: sorting.map(({id, desc}) => ({
              type: "column",
              column: id,
              desc,
            })),
            paging: {
              number: pagination.pageIndex + 1,
              size: pagination.pageSize,
            },
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
        columnFilter: (column) => columnFilters()[column]!,
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
