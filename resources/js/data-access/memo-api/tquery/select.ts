import {FuzzyGlobalFilterConfig, buildFuzzyGlobalFilter} from "components/ui/Table/tquery_filters/fuzzy_filter";
import {NON_NULLABLE, debouncedFilterTextAccessor} from "components/utils";
import {Signal, createMemo, createSignal, on} from "solid-js";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {ColumnName, DataRequest, Sort} from "./types";

interface RequestController {
  filterText: Signal<string>;
}

/** Creates a request creator used by a tquery-based select component. */
export function createSelectRequestCreator({
  intrinsicFilter,
  columns,
  sort,
  limit,
  distinct,
}: {
  intrinsicFilter?: FilterH;
  columns: ColumnName[];
  sort: Sort;
  limit: number;
  distinct?: boolean;
}): RequestCreator<RequestController> {
  return (schema) => {
    const [filter, setFilter] = createSignal<string>("");
    // eslint-disable-next-line solid/reactivity
    const debouncedFilter = debouncedFilterTextAccessor(filter);
    const filterReductor = createMemo(on(schema, (schema) => schema && new FilterReductor(schema)));
    const fuzzyFilterConfig = createMemo(() => {
      const sch = schema();
      if (!sch) {
        return undefined;
      }
      return {
        columns: columns.filter((c) => {
          const type = sch.columns.find(({name}) => name === c)?.type;
          return type === "string" || type === "text";
        }),
        // TODO: Consider adding columnsByPrefix for some columns, e.g. id= for Versum ids.
        // This would allow selecting e.g. a person by their Versum id.
      } satisfies FuzzyGlobalFilterConfig;
    });
    const request = createMemo((): DataRequest | undefined => {
      if (!schema()) {
        return undefined;
      }
      return {
        columns: columns.map((column) => ({type: "column", column})),
        filter: filterReductor()?.reduce({
          type: "op",
          op: "&",
          val: [intrinsicFilter, buildFuzzyGlobalFilter(debouncedFilter(), fuzzyFilterConfig()!)].filter(NON_NULLABLE),
        }),
        sort,
        paging: {size: limit},
        distinct,
      };
    });
    return {
      request,
      requestController: {
        filterText: [filter, setFilter],
      },
    };
  };
}
