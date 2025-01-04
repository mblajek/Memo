import {QueryKey} from "@tanstack/solid-query";
import {FuzzyGlobalFilterConfig} from "components/ui/Table/tquery_filters/fuzzy_filter";
import {NON_NULLABLE, useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {createSelectRequestCreator} from "data-access/memo-api/tquery/select";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {ColumnName, Sort} from "data-access/memo-api/tquery/types";
import {BsScissors} from "solid-icons/bs";
import {Accessor, VoidComponent, createMemo, createSignal, mergeProps, on, splitProps} from "solid-js";
import {Hr} from "../Hr";
import {
  MultipleSelectPropsPart,
  ReplacementItems,
  Select,
  SelectBaseProps,
  SelectItem,
  SingleSelectPropsPart,
} from "./Select";
import {mergeSelectProps} from "./select_helper";

export interface BaseTQuerySelectProps
  extends Pick<SelectBaseProps, "name" | "label" | "disabled" | "placeholder" | "small" | "autofocus"> {
  /**
   * The configuration of how the items are fetched from tquery.
   *
   * The query spec and its parts are not reactive and must not change!
   */
  readonly querySpec: TQueryConfig;
  /**
   * The additional tquery configuration, used to prioritise some items based on another request.
   * If present, the items from this request are displayed on top of the list, and the items
   * from the main request are displayed below them, with duplicates removed.
   *
   * This is useful for example when selecting a resource, where the most often used resources
   * should be displayed on top of the list.
   */
  readonly priorityQuerySpec?: TQueryConfig;
  /** Whether to add a horizontal line between the priority items and the regular items. Default: true. */
  readonly separatePriorityItems?: boolean;
  /**
   * A function called with a priority item and the corresponding regular item, if it exists.
   * The result is used instead of the priority item. Default: the priority item is used directly.
   * This is useful if the regular query returns more information than the priority query.
   */
  readonly mergeIntoPriorityItem?: (priorityItem: SelectItem, regularItem: SelectItem) => SelectItem;
  /** A query spec used when fetching replacement items. Default: same as querySpec (just with no limit). */
  readonly replacementQuerySpec?: TQueryConfig;
  /** Additional items to put at the top. */
  readonly topItems?: readonly SelectItem[] | ((filterText: string | undefined) => readonly SelectItem[] | undefined);
}

export interface TQueryConfig {
  /** The prefix used for the data query (this allows invalidating the tquery data). */
  readonly prefixQueryKey: QueryKey;
  readonly entityURL: string | undefined | Accessor<string | undefined>;
  /** A filter that is always applied to the query. */
  readonly intrinsicFilter?: FilterH;
  /** The column used as the value of items. It must be unique among the results. Default: `"id"`. */
  readonly valueColumn?: ColumnName;
  /**
   * The column to fetch and use as the text of items. If multiple columns are specified, the values
   * are joined by space, which is mostly useful for filtering to work. Default: `"name"`.
   */
  readonly textColumn?: ColumnName | readonly ColumnName[];
  /** Additional columns to fetch and make available in the row object. */
  readonly extraColumns?: readonly ColumnName[];
  /** Sorting of the items. By default sorts by the label columns. */
  readonly sort?: Sort;
  readonly limit?: number;
  /** See tquery DataRequest.distinct. */
  readonly distinct?: boolean;
  /** Column prefixes for filtering. */
  readonly columnsByPrefix?: FuzzyGlobalFilterConfig["columnsByPrefix"];
  readonly onColumnPrefixFilterUsed?: FuzzyGlobalFilterConfig["onColumnPrefixFilterUsed"];
  /**
   * A function creating the items. It can make use of the default item properties provided.
   * The default includes the value (taken from the value column) and the text (from the label columns).
   */
  readonly itemFunc?: (row: TQuerySelectDataRow, defItem: DefaultTQuerySelectItem) => SelectItem | undefined;
}

/** A fetched row, with the requested columns set. */
export class TQuerySelectDataRow {
  constructor(readonly data: Readonly<Partial<Record<ColumnName, unknown>>>) {}

  get<T = unknown>(column: ColumnName) {
    if (!Object.hasOwn(this.data, column)) {
      throw new Error(`Column '${column}' not present in row.`);
    }
    return (this.data[column] ?? undefined) as T | undefined;
  }

  getStr(column: ColumnName) {
    const value = this.get(column);
    return value == undefined ? undefined : String(value);
  }
}

export type DefaultTQuerySelectItem = Required<Pick<SelectItem, "value" | "text">>;

export type TQuerySelectProps = BaseTQuerySelectProps & (SingleSelectPropsPart | MultipleSelectPropsPart);

/** The default number of fetched items. */
const DEFAULT_LIMIT = 100;

const DEFAULT_PROPS = {
  separatePriorityItems: true,
} satisfies Partial<BaseTQuerySelectProps>;

function makeQuery(
  {
    prefixQueryKey,
    entityURL,
    intrinsicFilter,
    valueColumn = "id",
    textColumn = "name",
    extraColumns = [],
    sort,
    limit = DEFAULT_LIMIT,
    distinct,
    columnsByPrefix,
    onColumnPrefixFilterUsed,
    itemFunc,
  }: TQueryConfig,
  {initialExtraFilter}: {initialExtraFilter?: FilterH} = {},
) {
  const textColumns = Array.isArray(textColumn) ? textColumn : [textColumn];
  sort ||= textColumns.map((column) => ({type: "column", column}));
  const columns = [valueColumn, ...textColumns, ...extraColumns];
  const requestCreator = createSelectRequestCreator({
    intrinsicFilter,
    initialExtraFilter,
    columns,
    sort,
    limit,
    distinct,
    columnsByPrefix,
    onColumnPrefixFilterUsed,
  });
  const {
    dataQuery,
    requestController: {filterText, extraFilter},
  } = createTQuery({prefixQueryKey, entityURL, requestCreator});
  const items = createMemo<readonly SelectItem[]>(() => {
    if (!dataQuery.isSuccess) {
      return [];
    }
    return dataQuery
      .data!.data.map((rowData) => {
        const defItem: DefaultTQuerySelectItem = {
          value: rowData[valueColumn] as string,
          text: textColumns.map((column) => rowData[column]).join(" "),
        };
        return itemFunc ? itemFunc(new TQuerySelectDataRow(rowData), defItem) : defItem;
      })
      .filter(NON_NULLABLE);
  });
  return {
    valueColumn,
    dataQuery,
    items,
    filterText,
    extraFilter,
  };
}

export const TQuerySelect: VoidComponent<TQuerySelectProps> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, selectProps] = splitProps(defProps, [
    "querySpec",
    "priorityQuerySpec",
    "separatePriorityItems",
    "mergeIntoPriorityItem",
    "replacementQuerySpec",
    "topItems",
  ]);
  const t = useLangFunc();
  // Extract the static props. They must not change anyway.
  /* eslint-disable solid/reactivity */
  const limit = props.querySpec.limit || DEFAULT_LIMIT;
  const {dataQuery, items, filterText} = makeQuery({limit, ...props.querySpec});
  const replacementData = makeQuery(
    {limit: 1e6, ...(props.replacementQuerySpec || props.querySpec)},
    {initialExtraFilter: "never"},
  );
  /* eslint-enable solid/reactivity */
  const priorityData = createMemo(
    on(
      () => props.priorityQuerySpec,
      (priorityQuerySpec) =>
        priorityQuerySpec &&
        makeQuery({...priorityQuerySpec, limit: Math.min(priorityQuerySpec.limit ?? limit, limit)}),
    ),
  );
  const [replacementEnabled, setReplacementEnabled] = createSignal(false);
  const isSuccess = () => (priorityData()?.dataQuery.isSuccess ?? true) && dataQuery.isSuccess;
  const isFetching = () => priorityData()?.dataQuery.isFetching || dataQuery.isFetching;
  const topItems = () =>
    (typeof props.topItems === "function" ? props.topItems(filterText[0]()) : props.topItems) || [];
  /** The items and loading status. They are returned in a single memo to avoid races. */
  const joinedItemsAndIsLoading = createMemo<{readonly items: readonly SelectItem[]; readonly isLoading: boolean}>(
    (prev) => {
      if (!isSuccess() || isFetching()) {
        // Wait for both queries to finish fetching before processing any results.
        return {...prev, isLoading: true};
      }
      let array: SelectItem[] = [...topItems()];
      if (priorityData()) {
        let priorityItems = priorityData()!.items();
        const numPriorityItems = priorityItems.length;
        if (props.mergeIntoPriorityItem) {
          const regularItemsMap = new Map<string, SelectItem>();
          for (const item of items()) {
            regularItemsMap.set(item.value, item);
          }
          priorityItems = priorityItems.map((priorityItem) => {
            const regularItem = regularItemsMap.get(priorityItem.value);
            return regularItem ? props.mergeIntoPriorityItem!(priorityItem, regularItem) : priorityItem;
          });
        }
        array = [...array, ...priorityItems];
        if (numPriorityItems < limit) {
          const values = new Set(array.map((i) => i.value));
          const regularItems = items()
            .filter(({value}) => !values.has(value))
            .slice(0, limit - numPriorityItems);
          if (regularItems.length) {
            if (numPriorityItems && props.separatePriorityItems) {
              array.push({
                value: `__prioritySeparator__`,
                label: () => <Hr />,
                disabled: true,
              });
            }
            array = [...array, ...regularItems];
          }
        }
      } else {
        array = [...array, ...items()];
      }
      if (dataQuery.data!.meta.totalDataSize > limit) {
        array.push({
          value: `__limitExceeded__`,
          label: () => (
            <div class="flex flex-col items-center">
              <div class="self-stretch flex items-center">
                <BsScissors class="rotate-90 text-current" />
                <hr class="w-full border-grey-text border-dashed" />
              </div>
              <div class="text-sm">{t("select.limit_exceeded")}</div>
            </div>
          ),
          disabled: true,
        });
      }
      return {items: array, isLoading: false};
    },
    {
      // eslint-disable-next-line solid/reactivity
      items: topItems(),
      isLoading: true,
    },
  );
  function setFilterText(filter = "") {
    priorityData()?.filterText[1](filter);
    filterText[1](filter);
  }
  const mergedSelectProps = mergeSelectProps<"items" | "isLoading" | "onFilterChange">(selectProps, {
    items: () => joinedItemsAndIsLoading().items,
    isLoading: () => joinedItemsAndIsLoading().isLoading,
    onFilterChange: () => setFilterText,
  });
  return (
    <Select
      {...mergedSelectProps}
      getReplacementItems={(missingValues) => {
        setReplacementEnabled(false);
        replacementData.extraFilter[1]({
          type: "column",
          column: replacementData.valueColumn,
          op: "in",
          val: missingValues,
        });
        // Give the query time to change to the new parameters.
        setTimeout(() => setReplacementEnabled(true));
        // eslint-disable-next-line solid/reactivity
        return () =>
          ({
            isLoading: replacementData.dataQuery.isFetching || !replacementEnabled(),
            items: replacementData.items(),
          }) satisfies ReplacementItems;
      }}
    />
  );
};
