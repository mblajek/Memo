import {PaginationState, SortingState, VisibilityState} from "@tanstack/solid-table";
import {FuzzyGlobalFilterConfig, buildFuzzyGlobalFilter} from "components/ui/Table/tquery_filters/fuzzy_filter";
import {NON_NULLABLE, debouncedFilterTextAccessor} from "components/utils";
import {Accessor, Signal, createComputed, createMemo, createSignal, on} from "solid-js";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {Column, ColumnName, DataRequest, DataResponse} from "./types";

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
    // Initialise the request parts based on the config.
    createComputed(() => {
      const visibility: VisibilityState = {};
      const colFilters: ColumnFilters = {};
      for (const {name, initialVisible = true} of columnsConfig()) {
        colFilters[name] = createSignal<FilterH>();
        visibility[name] = initialVisible;
      }
      setColumnVisibility(visibility);
      setColumnFilters(colFilters);
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
        columnFilter: (column) => columnFilters()[column]!,
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
