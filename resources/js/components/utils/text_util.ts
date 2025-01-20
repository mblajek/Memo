import {EM_DASH, EN_DASH} from "components/ui/symbols";

export function removeDiacritics(text: string) {
  return (
    text
      .normalize("NFD")
      // Remove diacritics, especially for polish characters: https://stackoverflow.com/a/37511463/1832228
      .replaceAll(/\p{Diacritic}/gu, "")
      .replaceAll("ł", "l")
      .replaceAll("Ł", "L")
  );
}

export function replaceCommonSpecialCharacters(text: string) {
  return text
    .replaceAll(EM_DASH, "-")
    .replaceAll(EN_DASH, "-")
    .replaceAll("„", `"`)
    .replaceAll("“", `"`)
    .replaceAll("”", `"`)
    .replaceAll("‚", `'`)
    .replaceAll("‘", `'`)
    .replaceAll("’", `'`)
    .replaceAll(/\s/g, " ")
    .replaceAll("…", "...");
}

export function fullyLowerNormalise(text: string) {
  return replaceCommonSpecialCharacters(removeDiacritics(text.toLocaleLowerCase()));
}

export type MatchType = "%v%" | "%v" | "v%" | "=";

/**
 * Returns a predicate for text determining if it matches the filter, or undefined when filtering is
 * not required (any value would match the filter).
 */
export function createTextFilter(filterText: string, matchType: MatchType = "%v%"): TextFilterPredicate | undefined {
  if (!filterText && matchType !== "=") {
    return undefined;
  }
  // TODO: Improve the filtering, e.g. an uppercase or national character in the filter should only
  // match the same character in the text, whereas a lowercase or non-national character should match
  // any character that normalises to it.
  const normFilterText = fullyLowerNormalise(filterText);
  switch (matchType) {
    case "%v%":
      return (text: string) => text.includes(filterText) || fullyLowerNormalise(text).includes(normFilterText);
    case "%v":
      return (text: string) => text.endsWith(filterText) || fullyLowerNormalise(text).endsWith(normFilterText);
    case "v%":
      return (text: string) => text.startsWith(filterText) || fullyLowerNormalise(text).startsWith(normFilterText);
    case "=":
      return (text: string) => text === filterText || fullyLowerNormalise(text) === normFilterText;
    default:
      return matchType satisfies never;
  }
}

export interface TextFilterPredicate {
  (text: string): boolean;
}
