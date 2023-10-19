export type ColumnName = string;
export type CustomFilterName = string;

/** Parameters of a custom filter, defined for each custom filter separately. */
export type CustomFilterParams = Record<string, unknown>;

/** Date string in ISO format. */
export type DateString = string;
/** Date time string in ISO format in UTC. */
export type DateTimeString = string;

type Mapping<Key extends string, Value> = Readonly<Partial<Record<Key, Value>>>;

export interface Schema {
  readonly columns: ColumnSchema[];
  readonly customFilters?: Mapping<CustomFilterName, CustomFilter>;
}

// TODO: There are more possible column types:
//  - enum-related types (enum and multi-enum)
//  - dict-related types
//  - possible JSON types with structured data
export type ColumnSchema = BasicColumnSchema | CountColumnSchema;

interface ColumnSchemaBase {
  readonly name: ColumnName;
}

export type ColumnType = "bool" | "date" | "datetime" | "int" | "string" | "text" | "uuid";

export interface BasicColumnSchema extends ColumnSchemaBase {
  readonly type: ColumnType;
  readonly nullable?: boolean;
}

export interface CountColumnSchema extends ColumnSchemaBase {
  readonly type: "count";
  readonly nullable?: false;
}

export interface CustomFilter {
  /** Hint for the frontend on where to place the UI element. */
  readonly associatedColumn: ColumnName;
}

export interface DataRequest {
  readonly columns: Column[];
  readonly filter?: ConstFilter | Filter;
  readonly sort: Sort;
  readonly paging: Paging;
  readonly distinct?: boolean;
}

// TODO: Consider custom columns.
export type Column = DataColumn;

export interface DataColumn {
  readonly type: "column";
  readonly column: ColumnName;
}

/** A filter that matches everything / doesn't match anything. Only valid at the top level. */
export type ConstFilter = "always" | "never";

export type Filter = BoolOpFilter | ColumnFilter | CustomFilter;

interface FilterBase {
  /** Whether to reverse the result of the filter. This is applicable to all filters. */
  readonly inv?: boolean;
}

/**
 * A filter that performs a boolean _and_ or _or_ operation on the specified filters.
 * - If op is `"&"`, this matches if all of the filters in val match.
 * - If op is `"|"`, this matches if any of the filters in val match.
 */
export interface BoolOpFilter extends FilterBase {
  readonly type: "op";
  readonly op: "&" | "|";
  /** List of sub-filters. Cannot be empty. */
  readonly val: Filter[];
}

export type ColumnFilter = NullColumnFilter | ColumnValueFilter;
export type ColumnValueFilter =
  | BoolColumnFilter
  | DateColumnFilter
  | DateTimeColumnFilter
  | IntColumnFilter
  | StringColumnFilter
  | TextColumnFilter
  | UuidColumnFilter;

interface ColumnFilterBase extends FilterBase {
  readonly type: "column";
  readonly column: ColumnName;
}

/** A filter matching only null values. It is invalid for non-nullable columns. */
export interface NullColumnFilter extends ColumnFilterBase {
  readonly op: "null";
}

interface EqColumnFilter<T> extends ColumnFilterBase {
  readonly op: "=";
  /** The value to compare to. Cannot be empty string. */
  readonly val: T;
}
interface BinEqColumnFilter<T> extends ColumnFilterBase {
  readonly op: "==";
  /** The value to compare to. Cannot be empty string. */
  readonly val: T;
}
interface InColumnFilter<T> extends ColumnFilterBase {
  readonly op: "in";
  /** The values to compare to. Cannot contain an empty string. */
  readonly val: T[];
}
interface CmpColumnFilter<T> extends ColumnFilterBase {
  readonly op: ">" | "<" | ">=" | "<=";
  /** The value to compare to. Cannot be empty string. */
  readonly val: T;
}
/** A filter that matches a part of a textual column. */
interface ContainsColumnFilter extends ColumnFilterBase {
  /** Whether the val should appear at the end of the matched string, at the beginning, or anywhere. */
  readonly op: "%v" | "v%" | "%v%";
  /** The value that needs to appear in the searched string. Cannot be empty. */
  readonly val: string;
}
/** A filter that matches a textual column with a LIKE expression. */
interface LikeColumnFilter extends ColumnFilterBase {
  readonly op: "lv";
  /** The LIKE pattern with % denoting any number of characters and _ denoting any single character. */
  readonly val: string;
}
interface RegexpColumnFilter extends ColumnFilterBase {
  readonly op: "/v/";
  /** The regexp pattern to match. Cannot be empty. */
  readonly val: string;
}

export type BoolColumnFilter = EqColumnFilter<boolean>;
export type DateColumnFilter = EqColumnFilter<DateString> | InColumnFilter<DateString> | CmpColumnFilter<DateString>;
export type DateTimeColumnFilter = CmpColumnFilter<DateString>;
export type IntColumnFilter =
  | EqColumnFilter<number>
  | InColumnFilter<number>
  | CmpColumnFilter<number>
  | ContainsColumnFilter
  | LikeColumnFilter;
export type StringColumnFilter =
  | EqColumnFilter<string>
  | BinEqColumnFilter<string>
  | InColumnFilter<string>
  | CmpColumnFilter<string>
  | ContainsColumnFilter
  | LikeColumnFilter
  | RegexpColumnFilter;
export type TextColumnFilter = ContainsColumnFilter | LikeColumnFilter | RegexpColumnFilter;
export type UuidColumnFilter = EqColumnFilter<string> | InColumnFilter<string>;

export interface CustomFilter extends FilterBase {
  readonly type: "custom";
  readonly customFilter: CustomFilterName;
  readonly params: CustomFilterParams;
}

export interface Paging {
  /** The one-based page number. */
  readonly number: number;
  readonly size: number;
}

export interface DataResponse {
  readonly meta: DataResponseMeta;
  readonly data: DataItem[];
}

export interface DataResponseMeta {
  /** Number of records across all pages of results. */
  readonly totalDataSize: number;
}

export type DataItem = Mapping<ColumnName, unknown>;

/** Specification of the data sorting. The first element has the highest priority. */
export type Sort = SortItem[];

export type SortItem = SortColumn;

export interface SortColumn {
  readonly type: "column";
  readonly column: ColumnName;
  readonly desc?: boolean;
}

export function isDataType(column: ColumnSchema["type"]): column is ColumnType {
  switch (column) {
    case "bool":
    case "date":
    case "datetime":
    case "int":
    case "string":
    case "text":
    case "uuid":
      return true;
    case "count":
      return false;
    default:
      return column satisfies never;
  }
}
