import {BoolOpFilter, ColumnFilter, ColumnName, ColumnSchema, ConstFilter, Filter, Schema} from "./types";

/**
 * A helper for constructing filter. If it is a regular Filter, the values inside the filter
 * (at any depth) can be incorrect, e.g `val` can be an empty string or an empty array, and
 * that the bool op filter can contain FilterH values as sub-filters. These things are fixed
 * by the FilterReductor.
 */
export type FilterH = ConstFilter | Filter | BoolOpFilterH;
/** A bool operation filter that accepts FilterH as sub-filters. */
export type BoolOpFilterH = Omit<BoolOpFilter, "val"> & {readonly val: FilterH[]};

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
      const {nullable} = this.columnsData.get(column)!;
      if (op === "null") {
        if (!nullable) {
          // For non-nullable columns selecting null matches nothing.
          return "never";
        }
      } else {
        const {val} = filter;
        if (val === "") {
          const nullFilter = (): ReducedFilterH => (nullable ? {type: "column", column, op: "null"} : "never");
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
          } else if (op === "in") {
            // Not really possible, included for the exhaustive check to work.
          } else {
            op satisfies never;
          }
        }
        if (typeof val === "string" && val !== val.trim()) {
          if (op === "=" || op === "==") {
            // Will not match anything.
            return "never";
          }
          // TODO: Consider the case when val is not empty, but becomes empty after trimming.
        }
        if (op === "in") {
          const vals = new Set<string | number>(
            filter.val
              // Reject untrimmed values, they cannot be equal.
              .filter((v) => !(typeof v === "string" && v !== v.trim())),
          );
          /** Whether null satisfies this filter. */
          const orNull = vals.delete("") && nullable;
          let valsFilter: ReducedFilterH;
          if (!vals.size) {
            valsFilter = "never";
          } else if (vals.size === 1) {
            valsFilter = {type: "column", column, op: "=", val: [...vals][0]!};
          } else {
            valsFilter = {type: "column", column, op: "in", val: [...vals] as string[] | number[]};
          }
          return orNull
            ? this.reduce({type: "op", op: "|", val: [{type: "column", column, op: "null"}, valsFilter]})
            : valsFilter;
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
