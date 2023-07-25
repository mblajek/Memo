import {Filter} from "data-access/memo-api/tquery";

type FilterBase = {type: "global"} | {type: "column", column: string};

export const GLOBAL_CHAR = "*";
export const QUOTE = "'";

const GLOB = `\\${GLOBAL_CHAR}`;
const WORD_REGEXP = new RegExp(
  `(?:^|(?<=\\s))(${GLOB}?${QUOTE}.+?${QUOTE}${GLOB}?|\\S+)(?:$|\\s)`,
  "g");

function buildFuzzyFilter(text: string, filterBase: FilterBase): Filter | undefined {
  const wordFilters: Filter[] = [];
  for (const match of text.matchAll(WORD_REGEXP)) {
    let word = match[1]?.trimEnd();
    if (word) {
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
      const op = (startsWithGlob === endsWithGlob) ? "%v%" : startsWithGlob ? "%v" : "v%";
      word = word.slice(startsWithGlob ? 1 : 0, endsWithGlob ? -1 : undefined);
      if (word.length > 2 && word.startsWith(QUOTE) && word.endsWith(QUOTE))
        // Unquote, unless it's just "'" or "''".
        word = word.slice(1, -1);
      wordFilters.push({...filterBase, op, val: word});
    }
  }
  if (!wordFilters.length)
    return undefined;
  if (wordFilters.length === 1)
    return wordFilters[0];
  return {type: "op", op: "&", val: wordFilters};
}

/**
 * Creates a global filter from the filter text.
 *
 * The text is split into words, and each word must match the data independently.
 *
 * | Word:                   | Matches strings:
 * | :-                      | :-
 * | `abc` or `*abc*`        | containing "abc"
 * | `abc*`                  | starting with "abc"
 * | `*abc`                  | ending with "abc"
 * | `'a b'` or `*'a b'*`    | containing "a b" (without the quotes this would be two words)
 * | `'a b'*`                | starting with "a b"
 * | `*'a b'`                | ending with "a b"
 * | `'abc`                  | containing "'abc" (if there is no right quote further in the text)
 * | `a*b`                   | containing "a*b" (no global character in the middle)
 */
export function buildFuzzyGlobalFilter(text: string) {
  return buildFuzzyFilter(text, {type: "global"});
}

export function buildFuzzyStringColumnFilter(text: string, column: string) {
  return buildFuzzyFilter(text, {type: "column", column});
}
