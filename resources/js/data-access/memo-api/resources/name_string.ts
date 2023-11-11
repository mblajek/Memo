/**
 * A string representing some name. There are two variants:
 * - If the string starts with `+`, then it is a non-translatable and should be displayed in the UI
 *   as is (just without the initial `+`).
 * - Otherwise, it is a translatable string and should be translated before displaying. The translation
 *   key must be specified by the code that declares a field of the NameString type.
 */
export type NameString = string;

const UNTRANSLATABLE_NAME_PREFIX = "+";

export function isNameTranslatable(name: NameString) {
  return !name.startsWith(UNTRANSLATABLE_NAME_PREFIX);
}

export function getNameTranslation(name: NameString, translationFunc: (name: string) => string) {
  return isNameTranslatable(name) ? translationFunc(name) : name.substring(1);
}
