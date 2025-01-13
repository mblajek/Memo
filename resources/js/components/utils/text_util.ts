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
