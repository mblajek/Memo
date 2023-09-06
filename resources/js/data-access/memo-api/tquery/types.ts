export type ColumnName = string;
export type CustomFilterName = string;

/** Parameters of a custom filter, defined for each custom filter separately. */
export type CustomFilterParams = Record<string, unknown>;

/** Date string in ISO format. */
export type DateString = string;
/** Date time string in ISO format in UTC. */
export type DateTimeString = string;

type Mapping<Key extends string, Value> = Partial<Record<Key, Value>>;

export interface Schema {
  columns: ColumnSchema[];
  customFilters?: Mapping<CustomFilterName, CustomFilter>;
}

// TODO: There are more possible column types:
//  - enum-related types (enum and multi-enum)
//  - dict-related types
//  - possible JSON types with structured data
export type ColumnSchema = BasicColumnSchema;

interface ColumnSchemaBase {
  name: ColumnName;
}

export interface BasicColumnSchema extends ColumnSchemaBase {
  type: "string" | "text" | "decimal0" | "decimal2" | "bool" | "date" | "datetime";
}

export interface CustomFilter {
  /** Hint for the frontend on where to place the UI element. */
  associatedColumn: ColumnName;
}

export interface DataRequest {
  columns: Column[];
  filter?: Filter;
  sort: Sort;
  paging: Paging;
}

// TODO: Consider custom columns.
export type Column = DataColumn;

export interface DataColumn {
  type: "column";
  column: ColumnName;
}

export type Filter = BoolOpFilter | ColumnFilter | CustomFilter | GlobalFilter;

interface FilterBase {
  inv?: boolean;
}

export interface BoolOpFilter extends FilterBase {
  type: "op";
  op: "&" | "|";
  val: Filter[];
}

// TODO: Filter by enum-related columns.
export type ColumnFilter =
  | StringColumnFilter
  | DecimalColumnFilter
  | BoolColumnFilter
  | DateColumnFilter
  | DateTimeColumnFilter;

interface ColumnFilterBase extends FilterBase {
  type: "column";
  column: ColumnName;
}

export type StringFilterOp =
  | "="
  | "!="
  // LIKE match:
  | "%v"
  | "v%"
  | "%v%"
  // Regexp:
  | "/v/";

export type ComparableFilterOp = "=" | "!=" | ">" | "<" | ">=" | "<=";

export interface StringColumnFilter extends ColumnFilterBase {
  op: StringFilterOp;
  val: string;
}

export interface DecimalColumnFilter extends ColumnFilterBase {
  op: ComparableFilterOp;
  val: number;
}

export interface BoolColumnFilter extends ColumnFilterBase {
  op: "=";
  val: boolean;
}

export interface DateColumnFilter extends ColumnFilterBase {
  op: ComparableFilterOp;
  val: DateString;
}

export interface DateTimeColumnFilter extends ColumnFilterBase {
  op: ComparableFilterOp;
  val: DateTimeString;
}

export interface CustomFilter extends FilterBase {
  type: "custom";
  customFilter: CustomFilterName;
  params: CustomFilterParams;
}

export interface GlobalFilter extends FilterBase {
  type: "global";
  op: StringFilterOp;
  val: string;
}

export interface Paging {
  pageIndex: number;
  pageSize: number;
}

export interface DataResponse {
  meta: DataResponseMeta;
  data: DataItem[];
}

export interface DataResponseMeta {
  columns: Column[];
  /** Number of records across all pages of results. */
  totalDataSize: number;
}

export type DataItem = Mapping<ColumnName, unknown>;

/** Specification of the data sorting. The first element has the highest priority. */
export type Sort = SortItem[];

export type SortItem = SortColumn;

export interface SortColumn {
  type: "column";
  column: ColumnName;
  desc?: boolean;
}

// Utilities:

export type ColumnType = ColumnSchema["type"];

export interface FilterTypeByColumnType {
  string: StringColumnFilter;
  text: StringColumnFilter;
  decimal0: DecimalColumnFilter;
  decimal2: DecimalColumnFilter;
  bool: BoolColumnFilter;
  date: DateColumnFilter;
  datetime: DateTimeColumnFilter;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type checkColumnTypes = FilterTypeByColumnType[ColumnType];
