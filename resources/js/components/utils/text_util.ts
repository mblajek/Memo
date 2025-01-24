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
    .replaceAll("\t", " ");
  // TODO: Replacing with multicharacter string won't work currently, consider fixing it.
  // .replaceAll("…", "...")
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
  const filterArr = Array.from({length: filterText.length}, (_, i) => filterText.charCodeAt(i)!);
  switch (matchType) {
    case "%v%":
      return (text: string) => matchesAtStart(filterArr, text, 0, text.length - filterText.length);
    case "%v":
      return (text: string) => matchesAtStart(filterArr, text, text.length - filterText.length);
    case "v%":
      return (text: string) => matchesAtStart(filterArr, text, 0);
    case "=":
      return (text: string) => text.length === filterText.length && matchesAtStart(filterArr, text, 0);
    default:
      return matchType satisfies never;
  }
}

function matchesAtStart(filterArr: readonly number[], text: string, minStart: number, maxStart = minStart) {
  const textLower = text.toLocaleLowerCase();
  const textNorm = replaceCommonSpecialCharacters(removeDiacritics(text));
  const textNormLower = textNorm.toLocaleLowerCase();
  function matches(start: number) {
    for (let i = 0; i < filterArr.length; i++) {
      const filterCode = filterArr[i];
      const textIndex = start + i;
      if (
        filterCode !== text.charCodeAt(textIndex) &&
        filterCode !== textLower.charCodeAt(textIndex) &&
        filterCode !== textNorm.charCodeAt(textIndex) &&
        filterCode !== textNormLower.charCodeAt(textIndex)
      )
        return false;
    }
    return true;
  }
  for (let start = minStart; start <= maxStart; start++) {
    if (matches(start)) {
      return true;
    }
  }
  return false;
}

export interface TextFilterPredicate {
  (text: string): boolean;
}
