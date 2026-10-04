import {NON_NULLABLE} from "components/utils/array_filter";
import {useLangFunc} from "components/utils/lang";
import {createTextFilter, TextFilterPredicate} from "components/utils/text_util";
import {Dictionaries, Dictionary} from "data-access/memo-api/dictionaries";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {ColumnName, Schema, StringColumnFilter} from "data-access/memo-api/tquery/types";

export const GLOBAL_CHAR = "*";
export const QUOTE = "'";

export const EMPTY_CODE = QUOTE + QUOTE;
export const NONEMPTY_CODE = GLOBAL_CHAR;

const GLOB = `\\${GLOBAL_CHAR}`;

/**
 * A special syntax element of a filter text:
 * | Element:       | Example:
 * | :-             | :-
 * | `empty`        | `''`, also with a column prefix
 * | `nonempty`     | `*`, also with a column prefix
 * | `starts_with`  | `abc*`
 * | `ends_with`    | `*abc`
 * | `quoted`       | `'a b'`
 * | `column_exact` | `col=abc`
 */
export type FuzzySpecialSyntax = "empty" | "nonempty" | "starts_with" | "ends_with" | "quoted" | "column_exact";

/** A function called for each occurrence of a special syntax element in the filter text. */
export type OnFuzzySpecialSyntaxUsed = (syntax: FuzzySpecialSyntax) => void;

interface SpecialSyntaxOptions {
  readonly onSpecialSyntaxUsed?: OnFuzzySpecialSyntaxUsed;
}

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
function fuzzyWordFilter(
  word: string,
  {exact = false, onSpecialSyntaxUsed}: {readonly exact?: boolean} & SpecialSyntaxOptions = {},
) {
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
  if (startsWithGlob !== endsWithGlob) {
    onSpecialSyntaxUsed?.(startsWithGlob ? "ends_with" : "starts_with");
  }
  word = word.slice(startsWithGlob ? 1 : 0, endsWithGlob ? -1 : undefined);
  // Unquote, unless it's just "'" or "''".
  if (word.length > 2 && word.startsWith(QUOTE) && word.endsWith(QUOTE)) {
    word = word.slice(1, -1);
    onSpecialSyntaxUsed?.("quoted");
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
export function buildFuzzyTextualColumnFilter(
  filterText: string,
  {column, onSpecialSyntaxUsed}: {readonly column: string} & SpecialSyntaxOptions,
): FilterH {
  const filterBase = {type: "column", column} as const;
  filterText = filterText.trim();
  if (filterText === EMPTY_CODE) {
    onSpecialSyntaxUsed?.("empty");
    return {...filterBase, op: "null"};
  }
  if (filterText === NONEMPTY_CODE) {
    onSpecialSyntaxUsed?.("nonempty");
    return {...filterBase, op: "null", inv: true};
  }
  return {
    type: "op",
    op: "&",
    val: Array.from(filterText.matchAll(WORD_REGEXP), ([_match, word]) =>
      word ? {...filterBase, ...fuzzyWordFilter(word, {onSpecialSyntaxUsed})} : undefined,
    ).filter(NON_NULLABLE),
  };
}

/**
 * Creates a predicate filter from a filter text. Works the same as buildFuzzyTextualColumnFilter,
 * but filters on the frontend. Useful e.g. for filtering dictionary positions.
 * Returns undefined if no filtering is needed (any value would be accepted).
 */
export function buildFuzzyTextualLocalFilter(
  filterText: string,
  {onSpecialSyntaxUsed}: SpecialSyntaxOptions = {},
): TextFilterPredicate | undefined {
  filterText = filterText.trim();
  if (filterText === EMPTY_CODE) {
    onSpecialSyntaxUsed?.("empty");
    return (text) => !text;
  }
  if (filterText === NONEMPTY_CODE) {
    onSpecialSyntaxUsed?.("nonempty");
    return (text) => !!text;
  }
  const filters = Array.from(filterText.matchAll(WORD_REGEXP), ([_match, word]) =>
    word ? createWordFilter(fuzzyWordFilter(word, {onSpecialSyntaxUsed})) : undefined,
  ).filter(NON_NULLABLE);
  return filters.length ? (text) => filters.every((f) => f(text)) : undefined;
}

/** Runs the word filter on the value on frontend. Useful for static values, like dictionary positions. */
function createWordFilter({op, val}: WordFilter) {
  return createTextFilter(val, op);
}

interface FuzzyGlobalFilterConfigBase extends SpecialSyntaxOptions {
  readonly schema: Schema;
  /** The dictionaries, if dictionary columns filtering should be supported. */
  readonly dictionaries?: Dictionaries;
  /**
   * The list of columns filterable using prefix, e.g. `col:abc` or `col=abc`. The columns might be from outside
   * the columns list specified.
   */
  readonly columnsByPrefix?: ReadonlyMap<string, ColumnName>;
  readonly onColumnPrefixFilterUsed?: (prefix: string, column: ColumnName) => void;
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
    const filter = createWordFilter(wordFilter);
    if (!filter) {
      return "all";
    }
    const matching = dict.allPositions.filter((p) => filter(p.label));
    return matching.length === dict.allPositions.length ? "all" : matching.map((p) => p.id);
  }

  function columnFilter(column: ColumnName, wordFilter: WordFilter): FilterH | undefined {
    const colConfig = config.schema.columns.find((c) => c.name === column);
    if (!colConfig) {
      console.error(`Unexpected missing column: ${column}`);
      return undefined;
    }
    const {type} = colConfig;
    if (type === "string" || type === "text" || type === "string_list") {
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
    // Report the usage only if the column filter is actually created.
    const syntaxUsed: FuzzySpecialSyntax[] = exact ? ["column_exact"] : [];
    const filter = ((): FilterH | undefined => {
      if (word === EMPTY_CODE) {
        syntaxUsed.push("empty");
        return {type: "column", column, op: "null"};
      }
      if (word === NONEMPTY_CODE) {
        syntaxUsed.push("nonempty");
        return {type: "column", column, op: "null", inv: true};
      }
      return columnFilter(
        column,
        fuzzyWordFilter(word, {exact, onSpecialSyntaxUsed: (syntax) => syntaxUsed.push(syntax)}),
      );
    })();
    if (filter) {
      config.onColumnPrefixFilterUsed?.(colPrefix, column);
      for (const syntax of syntaxUsed) {
        config.onSpecialSyntaxUsed?.(syntax);
      }
    }
    return filter;
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
        const wordFilter = fuzzyWordFilter(word, {onSpecialSyntaxUsed: config.onSpecialSyntaxUsed});
        return {
          type: "op",
          op: "|",
          val: columns.map((column) => columnFilter(column, wordFilter)).filter(NON_NULLABLE),
        };
      },
    ).filter(NON_NULLABLE),
  };
}

export function useColumnsByPrefixUtil() {
  const t = useLangFunc();
  return {
    fromColumnPrefixes(key: string | readonly string[]): FuzzyGlobalFilterConfig["columnsByPrefix"] {
      const entries = Object.entries(t.getObjects<string | readonly string[]>(key, {mergeObjects: true}));
      return entries.length
        ? new Map<string, string>(
            entries.flatMap(([column, prefixes]) =>
              typeof prefixes === "string" ? [[prefixes, column]] : prefixes.map((prefix) => [prefix, column]),
            ),
          )
        : undefined;
    },
  };
}
