import {useTransContext} from "@mbarzda/solid-i18next";
import {dependOnTranslationsVersion} from "i18n_loader";
import i18next, {TOptions} from "i18next";
import {isDEV} from "./dev_mode";

interface LangFuncBase {
  (key: string | readonly string[], options?: TOptions): string;
}

/**
 * A function for getting the translation from a particular key. A list of keys can be used
 * to get the first available translation.
 */
export interface LangFunc extends LangFuncBase {
  getObjects<V = string>(key: string | readonly string[], options?: TGetObjectsOptions): Record<string, V>;
}

export type TGetObjectsOptions = TOptions & {
  /** Whether to merge the values from multiple keys, instead of returning the first present object. */
  mergeObjects?: boolean;
};

let langFunc: LangFunc | undefined;

/**
 * A wrapper for useTransContext with the basic overload options, and with better
 * types for usage as TSX attributes (no null returned).
 */
export function useLangFunc(): LangFunc {
  if (!langFunc) {
    const transContext = useTransContext();
    if (!transContext) {
      throw new Error(`Called useLangFunc outside of the provider.`);
    }
    const t = transContext[0];
    const langFuncBase: LangFuncBase = (key, options) => {
      if (i18next.language === "testing") {
        const entries = Object.entries({
          ...options,
          defaultValue: undefined,
        }).flatMap(([k, v]) => (v === undefined ? [] : [`${k}:${v}`]));
        return `${typeof key === "string" ? key : key[0]!}${entries.length ? `{${entries.join(",")}}` : ""}`;
      }
      dependOnTranslationsVersion();
      if (typeof key === "string") {
        return t(key, {defaultValue: `??${key}`, ...options});
      }
      if (!key.length) {
        throw new Error(`Called useLangFunc with an empty key list.`);
      }
      // Check if the value is present under any of the keys, or the default value is specified, and return it if so.
      const value = t(key as string[], {defaultValue: MISSING_VALUE, ...options});
      if (value !== MISSING_VALUE) {
        return value;
      }
      // If it's not present, try using the translation mechanism normally, but provide a default value
      // listing all the keys, if the options don't have a default value.
      return t(key[0]!, {defaultValue: `??${isDEV() ? key.join("|") : key[0]}`, ...options});
    };
    const getObjectsLangFunc = (key: string | readonly string[], options?: TOptions) =>
      // For returnObjects a record is returned instead of string.
      langFuncBase(key, {...options, returnObjects: true, defaultValue: {}}) as unknown as Record<string, string>;
    langFunc = Object.assign(langFuncBase, {
      getObjects(key, options) {
        return options?.mergeObjects && Array.isArray(key)
          ? Object.assign({}, ...key.toReversed().map((k) => getObjectsLangFunc(k, options)))
          : getObjectsLangFunc(key, options);
      },
    } satisfies Pick<LangFunc, "getObjects">);
  }
  return langFunc;
}

const MISSING_VALUE = "--__MISSING__--";
