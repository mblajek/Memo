import {FuzzyGlobalFilterConfig, buildFuzzyGlobalFilter} from "components/ui/Table/tquery_filters/fuzzy_filter";
import {NON_NULLABLE, debouncedFilterTextAccessor} from "components/utils";
import {Signal, createMemo, createSignal, on} from "solid-js";
import {useDictionaries} from "../dictionaries_and_attributes_context";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {ColumnName, DataRequest, Sort} from "./types";

interface RequestController {
  readonly filterText: Signal<string>;
  readonly extraFilter: Signal<FilterH | undefined>;
}

/** Creates a request creator used by a tquery-based select component. */
export function createSelectRequestCreator({
  intrinsicFilter,
  initialExtraFilter,
  columns,
  sort,
  limit,
  distinct,
  columnsByPrefix,
}: {
  intrinsicFilter?: FilterH;
  initialExtraFilter?: FilterH;
  columns: ColumnName[];
  sort: Sort;
  limit: number;
  distinct?: boolean;
  columnsByPrefix?: ReadonlyMap<string, ColumnName>;
}): RequestCreator<RequestController> {
  const dictionaries = useDictionaries();
  return (schema) => {
    const [filterText, setFilterText] = createSignal<string>("");
    const [extraFilter, setExtraFilter] = createSignal<FilterH | undefined>(initialExtraFilter);
    // eslint-disable-next-line solid/reactivity
    const debouncedFilter = debouncedFilterTextAccessor(filterText);
    const filterReductor = createMemo(on(schema, (schema) => schema && new FilterReductor(schema)));
    const fuzzyFilterConfig = createMemo(() => {
      const sch = schema();
      if (!sch) {
        return undefined;
      }
      return {
        schema: sch,
        columns,
        dictionaries: dictionaries(),
        columnsByPrefix,
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
          val: [intrinsicFilter, extraFilter(), buildFuzzyGlobalFilter(debouncedFilter(), fuzzyFilterConfig()!)].filter(
            NON_NULLABLE,
          ),
        }),
        sort,
        paging: {size: limit},
        distinct,
      };
    });
    return {
      request,
      requestController: {
        filterText: [filterText, setFilterText],
        extraFilter: [extraFilter, setExtraFilter],
      },
    };
  };
}
