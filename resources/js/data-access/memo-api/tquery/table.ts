import {PaginationState, SortingState, VisibilityState} from "@tanstack/solid-table";
import {Accessor, Signal, createComputed, createMemo, createSignal, on} from "solid-js";
import {DataRequest, DataResponse, Filter, RequestCreator, Schema} from ".";
import {debouncedAccessor} from "components/utils";

interface RequestController {
  columnVisibility: Signal<VisibilityState>;
  sorting: Signal<SortingState>;
  globalFilter: Signal<string>;
  pagination: Signal<PaginationState>;
}

const DEFAULT_PAGE_SIZE = 50;

/**
 * Returns visibility state with visibility of all the columns set explicitly to the given value.
 */
function allColumnsVisibility(schema: Schema, {visible = true} = {}) {
  const visibility: VisibilityState = {}
  for (const {name} of schema.columns)
    visibility[name] = visible;
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
  initialPageSize = DEFAULT_PAGE_SIZE,
}: {
  intrinsicFilter?: Accessor<Filter | undefined>,
  initialPageSize?: number,
}): RequestCreator<RequestController> {
  return schema => {
    const [allInited, setAllInited] = createSignal(false);
    const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({});
    const [globalFilter, setGlobalFilter] = createSignal<string>("");
    const [sorting, setSorting] = createSignal<SortingState>([]);
    const [pagination, setPagination] =
      createSignal<PaginationState>({pageIndex: 0, pageSize: initialPageSize});
    // Initialise the request parts based on the suggested values from schema.
    createComputed(() => {
      const sch = schema();
      if (sch) {
        let visibility: VisibilityState;
        if (sch.suggestedColumns) {
          visibility = allColumnsVisibility(sch, {visible: false});
          for (const name of sch.suggestedColumns)
            visibility[name] = true;
        } else
          visibility = allColumnsVisibility(sch);
        setColumnVisibility(visibility);
        setSorting((sch.suggestedSort || []).map(({column, dir}) => ({
          id: column,
          desc: dir === "desc",
        })));
        setAllInited(true);
      }
    });
    // Don't allow hiding all the columns.
    createComputed(on([schema, columnVisibility],
      ([schema, columnVisibility], prev) => {
        if (schema && !Object.values(columnVisibility).some(v => v)) {
          const prevColumnVisibility = prev?.[1];
          // Revert to the previous visibility state if possible, otherwise show all columns.
          setColumnVisibility(
            prevColumnVisibility && Object.values(prevColumnVisibility).some(v => v) ?
              prevColumnVisibility : allColumnsVisibility(schema));
        }
      }));
    /** The main sort column wrapped in memo to detect actual changes. */
    const mainSort = createMemo(() => sorting()[0]);
    // Go back to the first page on significant data changes.
    createComputed(on([globalFilter, mainSort], () => {
      setPagination(prev => ({...prev, pageIndex: 0}));
    }));
    // eslint-disable-next-line solid/reactivity
    const debouncedGlobalFilter = debouncedAccessor(globalFilter);
    const request = createMemo<DataRequest | undefined>(
      on([intrinsicFilter, schema, allInited,
        columnVisibility, sorting, debouncedGlobalFilter, pagination],
        ([intrinsicFilter, schema, allInited,
          columnVisibility, sorting, globalFilter, pagination]) => {
          if (!schema || !allInited)
            return undefined;
          const columns = new Set(schema.columns.map(({name}) => name));
          for (const [name, visible] of Object.entries(columnVisibility))
            if (!visible)
              columns.delete(name);
          const sort = sorting.map(({id, desc}) => ({
            type: "column",
            column: id,
            dir: desc ? "desc" : "asc",
          } as const));
          const andFilters: Filter[] = [];
          if (intrinsicFilter)
            andFilters.push(intrinsicFilter);
          if (globalFilter)
            andFilters.push({
              type: "global",
              op: "%v%",
              val: globalFilter,
            });
          const request: DataRequest = {
            columns: Array.from(columns, column => ({type: "column", column})),
            filter: {
              type: "op",
              op: "&",
              val: andFilters,
            },
            sort,
            paging: pagination,
          };
          return request;
        }));
    return {
      request,
      requestController: {
        columnVisibility: [columnVisibility, setColumnVisibility],
        sorting: [sorting, setSorting],
        globalFilter: [globalFilter, setGlobalFilter],
        pagination: [pagination, setPagination],
      },
    };
  };
}

export function tableHelper({schema, requestController, response}: {
  schema: Accessor<Schema | undefined>,
  requestController: RequestController,
  response: Accessor<DataResponse | undefined>,
}) {
  const rowsCount = () => response()?.meta.totalDataSize;
  const pageCount: Accessor<number> = createMemo(() => Math.ceil(
    Math.max(rowsCount() || 0, 1) / requestController.pagination[0]().pageSize));
  const scrollToTop = () => requestController.pagination[0]().pageIndex;
  return {rowsCount, pageCount, scrollToTop};
}
