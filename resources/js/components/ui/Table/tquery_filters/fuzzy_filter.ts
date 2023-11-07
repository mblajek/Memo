import {NON_NULLABLE} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {ColumnName, StringColumnFilter} from "data-access/memo-api/tquery/types";

export const GLOBAL_CHAR = "*";
export const QUOTE = "'";

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
  if (word.length > 2 && word.startsWith(QUOTE) && word.endsWith(QUOTE))
    // Unquote, unless it's just "'" or "''".
    word = word.slice(1, -1);
  return {op, val: word} satisfies Pick<StringColumnFilter, "op" | "val">;
}

/**
 * Creates a column filter for a string or text column, from the filter text.
 *
 * Special values of the filter text (regardless of the `exact` parameter):
 * | Filter text:            | Matches strings:
 * | :-                      | :-
 * | `*`                     | non-empty
 * | `''`                    | empty
 *
 * If the filter is not any of these values, it is split into words, and each word must match the
 * string independently. See fuzzyWordFilter.
 */
function fuzzyTextualColumnFilter(
  filterText: string,
  {column, exact = false}: {column: string; exact?: boolean},
): FilterH {
  const filterBase = {type: "column", column} as const;
  filterText = filterText.trim();
  if (filterText === QUOTE + QUOTE) {
    return {...filterBase, op: "=", val: ""};
  }
  if (filterText === GLOBAL_CHAR) {
    return {...filterBase, op: "=", val: "", inv: true};
  }
  return {
    type: "op",
    op: "&",
    val: Array.from(filterText.matchAll(WORD_REGEXP), ([_match, word]) =>
      word ? {...filterBase, ...fuzzyWordFilter(word, {exact})} : undefined,
    ).filter(NON_NULLABLE),
  };
}

/**
 * Creates a column filter for a string or text column, from the filter text.
 * See fuzzyTextualColumnFilter (the non-exact mode).
 */
export function buildFuzzyTextualColumnFilter(filterText: string, {column}: {column: string}): FilterH {
  return fuzzyTextualColumnFilter(filterText, {column});
}

export interface FuzzyGlobalFilterConfig {
  columns: ColumnName[];
  columnsByPrefix?: Map<string, string>;
}

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
 * | `abc`     | containing _abc_ in any column (etc, see fuzzyWordFilter)
 * | `col:abc` | containing _abc_ in the column with the short prefix _col_ (etc, see buildFuzzyTextualColumnFilter)
 * | `col=abc` | with the exact value _abc_ in the column with the short prefix _col_
 */
export function buildFuzzyGlobalFilter(filterText: string, config: FuzzyGlobalFilterConfig): FilterH {
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
          const column = config.columnsByPrefix?.get(colPrefix);
          if (column) {
            return fuzzyTextualColumnFilter(colPrefixWord, {column, exact: colPrefixOp === "="});
          }
        }
        const fuzzy = fuzzyWordFilter(word);
        return {
          type: "op",
          op: "|",
          val: config.columns.map((column) => ({type: "column", column, ...fuzzy})),
        };
      },
    ).filter(NON_NULLABLE),
  };
}
