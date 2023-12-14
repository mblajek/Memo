import {BoolOpFilter, ColumnFilter, ColumnName, ColumnSchema, ConstFilter, Filter, Schema, isDataColumn} from "./types";

/**
 * A helper for constructing filter. If it is a regular Filter, the values inside the filter
 * (at any depth) can be incorrect, e.g `val` can be an empty string or an empty array, and
 * that the bool op filter can contain FilterH values as sub-filters. These things are fixed
 * by the FilterReductor.
 */
export type FilterH = ConstFilter | Filter | BoolOpFilterH;
/** A bool operation filter that accepts FilterH as sub-filters. */
export type BoolOpFilterH = Omit<BoolOpFilter, "val"> & {readonly val: readonly FilterH[]};

/** A reduced filter. It is a regular, fully correct and at least somewhat optimised filter. */
export type ReducedFilterH = ConstFilter | Filter;

export function invert(filter: ReducedFilterH, invert?: boolean | undefined): ReducedFilterH;
export function invert(filter: FilterH, invert?: boolean | undefined): FilterH;
export function invert(filter: FilterH, invert?: boolean): FilterH {
  invert =
    arguments.length === 1
      ? true
      : // Called with e.g. filter.inv, which is optional and defaults to false.
        invert ?? false;
  if (!invert) {
    return filter;
  }
  switch (filter) {
    case "always":
      return "never";
    case "never":
      return "always";
    default:
      return {...filter, inv: !filter.inv};
  }
}

export class FilterReductor {
  private readonly columnsData = new Map<ColumnName, ColumnSchema>();

  constructor(schema: Schema) {
    for (const col of schema.columns) {
      this.columnsData.set(col.name, col);
    }
  }

  /**
   * Returns a reduced bool operation filter. First reduces all the sub-filters,
   * then applies any logic rules, e.g. removes the [identity element](https://en.wikipedia.org/wiki/Identity_element)
   * and returns the [absorbing element](https://en.wikipedia.org/wiki/Absorbing_element) if present.
   */
  private reduceBoolOp(filter: BoolOpFilterH): ReducedFilterH {
    const reducedIgnoredInv = ((): ReducedFilterH => {
      const {op, val} = filter;
      let identity: ConstFilter;
      let absorbing: ConstFilter;
      if (op === "&") {
        identity = "always";
        absorbing = "never";
      } else if (op === "|") {
        identity = "never";
        absorbing = "always";
      } else {
        return op satisfies never;
      }
      const reducedSubFilters: Filter[] = [];
      const subFiltersToProcess = val.toReversed();
      while (subFiltersToProcess.length) {
        const subFilter = this.reduce(subFiltersToProcess.pop()!);
        if (typeof subFilter === "string") {
          if (subFilter === absorbing) {
            /** The whole boolean operation was absorbed, e.g. a "never" was encountered in an "&" operation. */
            return absorbing;
          } else {
            // Identity element.
            continue;
          }
        } else {
          if (subFilter.type === "op" && subFilter.op === op && !subFilter.inv) {
            // Unnest a bool operation of the same type.
            subFiltersToProcess.push(...subFilter.val.toReversed());
          } else {
            reducedSubFilters.push(subFilter);
          }
        }
      }
      if (!reducedSubFilters.length) {
        return identity;
      }
      if (reducedSubFilters.length === 1) {
        return reducedSubFilters[0]!;
      }
      return {type: "op", op, val: reducedSubFilters};
    })();
    return invert(reducedIgnoredInv, filter.inv);
  }

  /** Reduces the column filter if necessary (also applies inv). */
  private reduceColumnOp(filter: ColumnFilter): ReducedFilterH {
    const reducedIgnoredInv = ((): ReducedFilterH | undefined => {
      const {column, op} = filter;
      const columnSchema = this.columnsData.get(column)!;
      const nullable = (isDataColumn(columnSchema) && columnSchema.nullable) || false;
      if (op === "null") {
        if (!nullable) {
          // For non-nullable columns selecting null matches nothing.
          return "never";
        }
      } else {
        const nullFilter = (): ReducedFilterH => (nullable ? {type: "column", column, op: "null"} : "never");
        const {val} = filter;
        if (val === "") {
          // Frontend treats the null values in string columns as empty strings (because this is what
          // is reasonable for the user).
          if (op === "=" || op === "==" || op === "lv" || op === "<" || op === "<=") {
            // Matches only null strings.
            return nullFilter();
          } else if (op === ">") {
            // Matches non-null strings.
            return invert(nullFilter());
          } else if (op === ">=" || op === "v%" || op === "%v" || op === "%v%" || op === "/v/") {
            // Matches everything.
            return "always";
          } else if (op === "has") {
            // Even a null column is not considered to "have an empty string", but rather to contain nothing.
            return "never";
          } else if (op === "in" || op === "has_all" || op === "has_any" || op === "has_only") {
            throw new Error(`Bad filter: ${JSON.stringify(filter)}`);
          } else {
            op satisfies never;
          }
        }
        if (typeof val === "string" && val !== val.trim()) {
          if (op === "=" || op === "==" || op === "has") {
            // Will not match anything.
            return "never";
          }
          // TODO: Consider the case when val is not empty, but becomes empty after trimming.
        }
        if (Array.isArray(val)) {
          const vals = new Set<string | number>(val);
          /** Removes from vals all invalid values, i.e. empty and untrimmed strings. Returns whether modified. */
          function deleteInvalidVals() {
            let modified = false;
            for (const v of vals) {
              if (typeof v !== "string") {
                // Assume no strings in the vals.
                return false;
              }
              if (!v || v !== v.trim()) {
                vals.delete(v);
                modified = true;
              }
            }
            return modified;
          }
          const valsArray = () => [...vals] as string[] | number[];
          if (op === "in") {
            deleteInvalidVals();
            return vals.size === 0
              ? "never"
              : vals.size === 1
                ? {type: "column", column, op: "=", val: valsArray()[0]!}
                : {type: "column", column, op: "in", val: valsArray()};
          } else if (op === "=") {
            const hadInvalidVals = deleteInvalidVals();
            return hadInvalidVals
              ? "never"
              : vals.size === 0
                ? nullFilter()
                : {type: "column", column, op: "=", val: valsArray() as /* currently only */ string[]};
          } else {
            const stringValsArray = valsArray as () => string[];
            if (op === "has_all") {
              const hadInvalidVals = deleteInvalidVals();
              return hadInvalidVals
                ? "never"
                : vals.size === 0
                  ? "always"
                  : vals.size === 1
                    ? {type: "column", column, op: "has", val: stringValsArray()[0]!}
                    : {type: "column", column, op: "has_all", val: stringValsArray()};
            } else if (op === "has_any") {
              deleteInvalidVals();
              return vals.size === 0
                ? "never"
                : vals.size === 1
                  ? {type: "column", column, op: "has", val: stringValsArray()[0]!}
                  : {type: "column", column, op: "has_any", val: stringValsArray()};
            } else if (op === "has_only") {
              deleteInvalidVals();
              return vals.size === 0 ? nullFilter() : {type: "column", column, op: "has_only", val: stringValsArray()};
            }
          }
          throw new Error(`Bad filter: ${JSON.stringify(filter)}`);
        }
      }
    })();
    return reducedIgnoredInv ? invert(reducedIgnoredInv, filter.inv) : filter;
  }

  /** Returns a reduced filter. The returned filter is correct and optimised. */
  reduce(filter: FilterH): ReducedFilterH {
    if (typeof filter === "string") {
      return filter;
    }
    switch (filter.type) {
      case "op":
        return this.reduceBoolOp(filter);
      case "column":
        return this.reduceColumnOp(filter);
      case "custom":
        return filter;
      default:
        return filter satisfies never;
    }
  }
}
