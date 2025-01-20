import {LangFunc} from "components/utils/lang";
import {TOptions} from "i18next";

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
export function getNameTranslation(
  t: LangFunc,
  name: NameString,
  keyFunc: (name: string) => string | readonly string[],
  o?: TOptions,
): string;
export function getNameTranslation(
  ...args:
    | [NameString, (name: string) => string]
    | [LangFunc, NameString, (name: string) => string | readonly string[], TOptions?]
) {
  function isDirect(a: typeof args): a is [NameString, (name: string) => string] {
    return typeof args[0] === "string";
  }
  const [name, translationFunc] = isDirect(args) ? args : [args[1], (name: string) => args[0](args[2](name), args[3])];
  return isNameTranslatable(name) ? translationFunc(name) : name.substring(1);
}
