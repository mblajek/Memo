import {NON_NULLABLE} from "components/utils";
import {Dictionaries, Dictionary} from "data-access/memo-api/dictionaries";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {ColumnName, Schema, StringColumnFilter} from "data-access/memo-api/tquery/types";

export const GLOBAL_CHAR = "*";
export const QUOTE = "'";

export const EMPTY_CODE = QUOTE + QUOTE;
export const NONEMPTY_CODE = GLOBAL_CHAR;

const GLOB = `\\${GLOBAL_CHAR}`;

/** The regexp for splitting textual column filter into words. */
const WORD_REGEXP = new RegExp(`(?:^|(?<=\\s))(${GLOB}?${QUOTE}.+?${QUOTE}${GLOB}?|\\S+)(?:$|\\s)`, "g");

/**
 * Returns the filter for a single word.
 *
 * In the default (non-exact) mode:
 * | Word:                   | Matches strings:
 * | :-                      | :-
 * | `abc` or `*abc*`        | containing _abc_
 * | `abc*`                  | starting with _abc_
 * | `*abc`                  | ending with _abc_
 * | `'a b'` or `*'a b'*`    | containing the substring _a b_ (without the quotes this would be two words)
 * | `'abc`                  | containing _'abc_ (if there is no right quote further in the text)
 * | `a*b`                   | containing _a*b_ (no global character in the middle)
 * | `*`                     | containing _*_ (not a special character as a word)
 * | `**`                    | containing _**_ (not a special character as a word)
 * | `''`                    | containing _''_ (no special meaning as a word)
 *
 * In the exact mode, the * character doesn't have any special meaning. The quotes, on the other hand,
 * can still be used just like in the default mode.
 */
function fuzzyWordFilter(word: string, {exact = false} = {}) {
  let startsWithGlob: boolean;
  let endsWithGlob: boolean;
  if (word === GLOBAL_CHAR || word === GLOBAL_CHAR + GLOBAL_CHAR) {
    // Special case, treat as regular text and not global character.
    startsWithGlob = false;
    endsWithGlob = false;
  } else if (exact) {
    // Exact match, so ignore the global characters.
    startsWithGlob = false;
    endsWithGlob = false;
  } else {
    startsWithGlob = word.startsWith(GLOBAL_CHAR);
    endsWithGlob = word.endsWith(GLOBAL_CHAR);
  }
  const op = exact ? "=" : startsWithGlob === endsWithGlob ? "%v%" : startsWithGlob ? "%v" : "v%";
  word = word.slice(startsWithGlob ? 1 : 0, endsWithGlob ? -1 : undefined);
  // Unquote, unless it's just "'" or "''".
  if (word.length > 2 && word.startsWith(QUOTE) && word.endsWith(QUOTE)) {
    word = word.slice(1, -1);
  }
  return {op, val: word} satisfies Pick<StringColumnFilter, "op" | "val">;
}

type WordFilter = ReturnType<typeof fuzzyWordFilter>;

/**
 * Creates a column filter for a string or text column, from the filter text.
 *
 * Special values of the filter text:
 * | Filter text:            | Matches strings:
 * | :-                      | :-
 * | `*`                     | non-empty
 * | `''`                    | empty
 *
 * If the filter is not any of these values, it is split into words, and each word must match the
 * string independently. See fuzzyWordFilter (the default, non-exact mode).
 */
export function buildFuzzyTextualColumnFilter(filterText: string, {column}: {column: string}): FilterH {
  const filterBase = {type: "column", column} as const;
  filterText = filterText.trim();
  if (filterText === EMPTY_CODE) {
    return {...filterBase, op: "null"};
  }
  if (filterText === NONEMPTY_CODE) {
    return {...filterBase, op: "null", inv: true};
  }
  return {
    type: "op",
    op: "&",
    val: Array.from(filterText.matchAll(WORD_REGEXP), ([_match, word]) =>
      word ? {...filterBase, ...fuzzyWordFilter(word)} : undefined,
    ).filter(NON_NULLABLE),
  };
}

/** Runs the word filter on the value on frontend. Useful for static values, like dictionary positions. */
function matchesWordFilter(value: string, wordFilter: WordFilter) {
  value = value.toLocaleLowerCase();
  const filterVal = wordFilter.val.toLocaleLowerCase();
  switch (wordFilter.op) {
    case "%v%":
      return value.includes(filterVal);
    case "%v":
      return value.endsWith(filterVal);
    case "v%":
      return value.startsWith(filterVal);
    case "=":
      return value === filterVal;
    default:
      return wordFilter.op satisfies never;
  }
}

interface FuzzyGlobalFilterConfigBase {
  readonly schema: Schema;
  /** The dictionaries, if dictionary columns filtering should be supported. */
  readonly dictionaries?: Dictionaries;
  /**
   * The list of columns filterable using prefix, e.g. `col:abc` or `col=abc`. The columns might be from outside
   * the columns list specified.
   */
  readonly columnsByPrefix?: ReadonlyMap<string, ColumnName>;
}

/** Config for filtering the specified columns. */
interface FuzzyGlobalFilterWithColumnsConfig extends FuzzyGlobalFilterConfigBase {
  /** The list of columns to run the fuzzy search on. */
  readonly columns: ColumnName[];
}

/** Config for filtering all the schema columns. */
interface FuzzyGlobalFilterWithAutoColumnsConfig extends FuzzyGlobalFilterConfigBase {
  readonly columns?: undefined;
  /** The list of columns to skip from the schema. */
  readonly skipColumns?: ColumnName[];
}

export type FuzzyGlobalFilterConfig = FuzzyGlobalFilterWithColumnsConfig | FuzzyGlobalFilterWithAutoColumnsConfig;

const COLUMN_PREFIX_PAT = `(?:\\p{L}|[._\\d])+`;
const COLUMN_PREFIX_OPS = [":", "="];

/** The regexp for splitting global filter into words, possibly with column prefixes. */
const GLOBAL_WORD_REGEXP = new RegExp(
  `(?:^|(?<=\\s))((?:(${COLUMN_PREFIX_PAT})(${COLUMN_PREFIX_OPS.join("|")}))?` +
    `(${GLOB}?${QUOTE}.+?${QUOTE}${GLOB}?|\\S+))(?:$|\\s)`,
  "gu",
);

/**
 * Creates a global filter from the filter text.
 *
 * The filter text is split into words, possibly with column prefixes. Each word must match the record.
 *
 * | Word:     | Matches records:
 * | :-        | :-
 * | `abc`     | containing _abc_ in any of the specified columns
 * | `col:abc` | containing _abc_ in the column with the short prefix _col_
 * | `col=abc` | with the exact value _abc_ in the column with the short prefix _col_
 *
 * See fuzzyWordFilter.
 */
export function buildFuzzyGlobalFilter(filterText: string, config: FuzzyGlobalFilterConfig): FilterH {
  const columns = ((): ColumnName[] => {
    if (config.columns) {
      for (const column of config.columns) {
        if (!config.schema.columns.some((c) => c.name === column)) {
          throw new Error(`Column ${column} not found in schema`);
        }
      }
      return config.columns;
    }
    if (config.skipColumns) {
      for (const column of config.skipColumns) {
        if (!config.schema.columns.some((c) => c.name === column)) {
          throw new Error(`Column ${column} not found in schema`);
        }
      }
      return config.schema.columns.filter((c) => !config.skipColumns?.includes(c.name)).map(({name}) => name);
    }
    return config.schema.columns.map(({name}) => name);
  })();

  function matchingDictPositions(dict: Dictionary, wordFilter: WordFilter): string[] | "all" {
    const matching = dict.allPositions.filter((p) => matchesWordFilter(p.label, wordFilter)).map((p) => p.id);
    return matching.length === dict.allPositions.length ? "all" : matching;
  }

  function columnFilter(column: ColumnName, wordFilter: WordFilter): FilterH | undefined {
    const colConfig = config.schema.columns.find((c) => c.name === column);
    if (!colConfig) {
      return undefined;
    }
    const {type} = colConfig;
    if (type === "string" || type === "text") {
      return {type: "column", column, ...wordFilter};
    } else if (type === "dict") {
      if (!config.dictionaries) {
        return undefined;
      }
      const matching = matchingDictPositions(config.dictionaries.get(colConfig.dictionaryId), wordFilter);
      return matching === "all"
        ? {type: "column", column, op: "null", inv: true}
        : {type: "column", column, op: "in", val: matching};
    } else if (type === "dict_list") {
      if (!config.dictionaries) {
        return undefined;
      }
      const matching = matchingDictPositions(config.dictionaries.get(colConfig.dictionaryId), wordFilter);
      return matching === "all"
        ? {type: "column", column, op: "null", inv: true}
        : {type: "column", column, op: "has_any", val: matching};
    } else {
      return undefined;
    }
  }

  function getColPrefixFilter(colPrefix: string, word: string, exact: boolean): FilterH | undefined {
    const column = config.columnsByPrefix?.get(colPrefix);
    if (!column) {
      return undefined;
    }
    if (word === EMPTY_CODE) {
      return {type: "column", column, op: "null"};
    }
    if (word === NONEMPTY_CODE) {
      return {type: "column", column, op: "null", inv: true};
    }
    return columnFilter(column, fuzzyWordFilter(word, {exact}));
  }

  return {
    type: "op",
    op: "&",
    val: Array.from(
      filterText.trim().matchAll(GLOBAL_WORD_REGEXP),
      ([_match, word, colPrefix, colPrefixOp, colPrefixWord]): FilterH | undefined => {
        if (!word) {
          return undefined;
        }
        if (colPrefix && colPrefixWord) {
          const colPrefixFilter = getColPrefixFilter(colPrefix, colPrefixWord, colPrefixOp === "=");
          if (colPrefixFilter) {
            return colPrefixFilter;
          }
        }
        const wordFilter = fuzzyWordFilter(word);
        return {
          type: "op",
          op: "|",
          val: columns.map((column) => columnFilter(column, wordFilter)).filter(NON_NULLABLE),
        };
      },
    ).filter(NON_NULLABLE),
  };
}
