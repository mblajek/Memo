import {FilterH} from "data-access/memo-api/tquery";

export const GLOBAL_CHAR = "*";
export const QUOTE = "'";

const GLOB = `\\${GLOBAL_CHAR}`;
const WORD_REGEXP = new RegExp(`(?:^|(?<=\\s))(${GLOB}?${QUOTE}.+?${QUOTE}${GLOB}?|\\S+)(?:$|\\s)`, "g");

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
 * string independently.
 * | Word:                   | Matches strings:
 * | :-                      | :-
 * | `abc` or `*abc*`        | containing "abc"
 * | `abc*`                  | starting with "abc"
 * | `*abc`                  | ending with "abc"
 * | `'a b'` or `*'a b'*`    | containing "a b" (without the quotes this would be two words)
 * | `'abc`                  | containing "'abc" (if there is no right quote further in the text)
 * | `a*b`                   | containing "a*b" (no global character in the middle)
 */
export function buildFuzzyTextualColumnFilter(filterText: string, {column}: {column: string}): FilterH {
  const filterBase = {type: "column", column} as const;
  filterText = filterText.trim();
  if (filterText === GLOBAL_CHAR) {
    return {...filterBase, op: "null", inv: true};
  }
  if (filterText === QUOTE + QUOTE) {
    return {...filterBase, op: "null"};
  }
  return {
    type: "op",
    op: "&",
    val: Array.from(filterText.matchAll(WORD_REGEXP), (match): FilterH => {
      let word = match[1]?.trimEnd();
      if (!word) {
        return "always";
      }
      let startsWithGlob: boolean;
      let endsWithGlob: boolean;
      if (word === GLOBAL_CHAR || word === GLOBAL_CHAR + GLOBAL_CHAR) {
        // Special case, treat as regular text and not global character.
        startsWithGlob = false;
        endsWithGlob = false;
      } else {
        startsWithGlob = word.startsWith(GLOBAL_CHAR);
        endsWithGlob = word.endsWith(GLOBAL_CHAR);
      }
      const op = startsWithGlob === endsWithGlob ? "%v%" : startsWithGlob ? "%v" : "v%";
      word = word.slice(startsWithGlob ? 1 : 0, endsWithGlob ? -1 : undefined);
      if (word.length > 2 && word.startsWith(QUOTE) && word.endsWith(QUOTE))
        // Unquote, unless it's just "'" or "''".
        word = word.slice(1, -1);
      return {...filterBase, op, val: word};
    }),
  };
}

export function buildFuzzyGlobalFilter(filterText: string): FilterH {
  // TODO: Implement global fuzzy filtering.
  return "always";
}
