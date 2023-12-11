import {LangPrefixFunc} from "components/utils";

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

export function getNameTranslation(name: NameString, translationFunc: (name: string) => string): string;
export function getNameTranslation(t: LangPrefixFunc, name: NameString, keyFunc: (name: string) => string): string;
export function getNameTranslation(
  ...args: [NameString, (name: string) => string] | [LangPrefixFunc, NameString, (name: string) => string]
) {
  const [name, translationFunc] = args.length === 2 ? args : [args[1], makeTranslationFunc(args[0], args[2])];
  return isNameTranslatable(name) ? translationFunc(name) : name.substring(1);
}

export function makeTranslationFunc(t: LangPrefixFunc, keyFunc: (name: string) => string) {
  return (name: string) => {
    const key = keyFunc(name);
    return t(key, {defaultValue: `?? ${key}`});
  };
}
