import {trimInput} from "components/ui/form/util";
import {removeDiacritics} from "components/utils/text_util";

/**
 * Produces the camelCase base of an api name from the attribute name,
 * e.g. "Data zgłoszenia" → "dataZgloszenia". The api name must be ASCII, so diacritics are
 * transliterated and any other non-alphanumeric characters act as word separators.
 */
export function getApiNameBase(name: string): string {
  return trimInput(removeDiacritics(name.toLocaleLowerCase()).replaceAll(/[^a-z0-9]/gu, " "))
    .split(" ")
    .filter(Boolean)
    .map((word, index) => (index ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join("");
}

/** The random hex suffix distinguishing generated api names, as used by the data migrations. */
export function randomApiNameSuffix(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Whether the api name is one generated from the given name: its base followed by "U" and
 * any number of hex digits (or empty, when the name is empty).
 */
export function apiNameMatchesName(apiName: string, name: string): boolean {
  const base = getApiNameBase(name);
  return base ? new RegExp(`^${base}U[0-9a-f]*$`).test(apiName) : apiName === "";
}

/**
 * The api name generated from the name. The hex suffix of the previous api name is reused
 * as is; a random suffix is generated when there is none (e.g. the name was empty before).
 */
export function getApiNameSuggestion(name: string, previousApiName: string): string {
  const base = getApiNameBase(name);
  if (!base) {
    return "";
  }
  const suffix = previousApiName.match(/U([0-9a-f]*)$/)?.[1] ?? randomApiNameSuffix();
  return `${base}U${suffix}`;
}
