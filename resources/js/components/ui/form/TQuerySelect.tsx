import {QueryKey} from "@tanstack/solid-query";
import {NON_NULLABLE, useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {createSelectRequestCreator} from "data-access/memo-api/tquery/select";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {ColumnName, Sort} from "data-access/memo-api/tquery/types";
import {BsScissors} from "solid-icons/bs";
import {VoidComponent, createMemo, createUniqueId, mergeProps, splitProps} from "solid-js";
import {MultipleSelectPropsPart, Select, SelectBaseProps, SelectItem, SingleSelectPropsPart} from "./Select";
import {mergeSelectProps} from "./select_helper";

interface BaseProps extends Pick<SelectBaseProps, "name" | "label" | "disabled" | "placeholder" | "small"> {
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
   *
   * The query spec and its parts are not reactive and must not change!
   */
  readonly priorityQuerySpec?: TQueryConfig;
  /** Whether to add a horizontal line between the priority items and the regular items. Default: true. */
  readonly separatePriorityItems?: boolean;
}

export interface TQueryConfig {
  /** The prefix used for the data query (this allows invalidating the tquery data). */
  readonly prefixQueryKey: QueryKey;
  readonly entityURL: string;
  /** A filter that is always applied to the query. */
  readonly intrinsicFilter?: FilterH;
  /** The column used as the value of items. It must be unique among the results. Default: `"id"`. */
  readonly valueColumn?: ColumnName;
  /** The list of columns to fetch (other than the value column). Default: `["name"]`. */
  readonly labelColumns?: ColumnName[];
  /** Sorting of the items. By default sorts by the label columns. */
  readonly sort?: Sort;
  readonly limit?: number;
  /** See tquery DataRequest.distinct. */
  readonly distinct?: boolean;
  /**
   * A function creating the items. It can make use of the default item properties provided.
   * The default includes the value (taken from the value column) and the text (from the label columns).
   */
  readonly itemFunc?: (row: Row, defItem: () => DefaultTQuerySelectItem) => SelectItem | undefined;
}

/** A fetched row, with the requested columns set. */
class Row {
  constructor(readonly data: Readonly<Partial<Record<ColumnName, unknown>>>) {}

  get<T = unknown>(column: ColumnName) {
    if (!Object.hasOwn(this.data, column)) {
      throw new Error(`Column '${column}' not present in row.`);
    }
    return this.data[column] as T;
  }

  getStr(column: ColumnName) {
    const value = this.get(column);
    return value == undefined ? undefined : String(value);
  }
}

type DefaultTQuerySelectItem = Required<Pick<SelectItem, "value" | "text">>;

type Props = BaseProps & (SingleSelectPropsPart | MultipleSelectPropsPart);

const DEFAULT_LIMIT = 200;

const DEFAULT_PROPS = {
  separatePriorityItems: true,
} satisfies Partial<BaseProps>;

function makeQuery({
  prefixQueryKey,
  entityURL,
  intrinsicFilter,
  valueColumn = "id",
  labelColumns = ["name"],
  sort = labelColumns.map((column) => ({type: "column", column})),
  limit = DEFAULT_LIMIT,
  distinct,
  itemFunc,
}: TQueryConfig) {
  const columns = [valueColumn, ...labelColumns];
  const requestCreator = createSelectRequestCreator({
    intrinsicFilter,
    columns,
    sort,
    limit,
    distinct,
  });
  const {
    dataQuery,
    requestController: {filterText},
  } = createTQuery({
    prefixQueryKey: prefixQueryKey,
    entityURL: entityURL,
    requestCreator,
  });
  const items = createMemo<readonly SelectItem[]>(() => {
    if (!dataQuery.isSuccess) {
      return [];
    }
    return dataQuery
      .data!.data.map((rowData) => {
        const defItem = () => ({
          value: rowData[valueColumn] as string,
          text: labelColumns.map((column) => rowData[column]).join(" "),
        });
        return itemFunc ? itemFunc(new Row(rowData), defItem) : defItem();
      })
      .filter(NON_NULLABLE);
  });
  return {
    dataQuery,
    items,
    filterText,
  };
}

export const TQuerySelect: VoidComponent<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, selectProps] = splitProps(defProps, ["querySpec", "priorityQuerySpec", "separatePriorityItems"]);
  const t = useLangFunc();
  // Extract the static props. They must not change anyway.
  /* eslint-disable solid/reactivity */
  const limit = props.querySpec.limit || DEFAULT_LIMIT;
  const querySpec = {limit, ...props.querySpec};
  const priorityQuerySpec = props.priorityQuerySpec && {limit, ...props.priorityQuerySpec};
  /* eslint-enable solid/reactivity */
  const priorityData = priorityQuerySpec && makeQuery(priorityQuerySpec);
  const {dataQuery, items, filterText} = makeQuery(querySpec);
  const isSuccess = () => (priorityData?.dataQuery.isSuccess ?? true) && dataQuery.isSuccess;
  const isFetching = () => priorityData?.dataQuery.isFetching || dataQuery.isFetching;
  const joinedItems = createMemo<readonly SelectItem[]>((prevJoinedItems) => {
    if (!isSuccess() || isFetching()) {
      // Wait for both queries to finish fetching before processing any results.
      return prevJoinedItems;
    }
    let array: SelectItem[];
    if (priorityData) {
      array = priorityData.items().slice(0, limit);
      const numPriorityItems = array.length;
      if (numPriorityItems < limit) {
        const values = new Set(array.map((i) => i.value));
        const regularItems = items().filter(({value}) => !values.has(value));
        if (regularItems.length) {
          if (numPriorityItems && props.separatePriorityItems) {
            array.push({
              value: `_prioritySeparator_${createUniqueId()}`,
              label: () => <hr class="border-input-border" />,
              disabled: true,
            });
          }
          array = [...array, ...regularItems.slice(0, limit - numPriorityItems)];
        }
      }
    } else {
      array = items().slice(0, limit);
    }
    if (dataQuery.data!.meta.totalDataSize > limit) {
      array.push({
        value: `_limitExceeded_${createUniqueId()}`,
        label: () => (
          <div class="flex flex-col items-center">
            <div class="self-stretch flex items-center">
              <BsScissors class="rotate-90" />
              <hr class="w-full border-current border-dashed" />
            </div>
            <div class="text-sm">{t("select.limit_exceeded")}</div>
          </div>
        ),
        disabled: true,
      });
    }
    return array;
  }, []);
  function setFilterText(filter = "") {
    priorityData?.filterText[1](filter);
    filterText[1](filter);
  }
  const mergedSelectProps = mergeSelectProps<"items" | "onFilterChange" | "isLoading">(selectProps, {
    items: joinedItems,
    onFilterChange: () => setFilterText,
    isLoading: isFetching,
  });
  return <Select {...mergedSelectProps} />;
};
