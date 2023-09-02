import {useTransContext} from "@mbarzda/solid-i18next";
import {TOptions} from "i18next";

/**
 * A wrapper for useTransContext with the basic overload options, and with better
 * types for usage as TSX attributes (no null returned).
 */
export function useLangFunc(): LangPrefixFunc {
  const [t] = useTransContext();
  return (key: string, options?: TOptions) => (options ? t(key, options) : t(key));
}

/** A function for getting the translation value from a particular key. */
export type LangEntryFunc = (options?: TOptions) => string;

export function getLangEntryFunc(func: LangPrefixFunc, key: string): LangEntryFunc {
  return (options) => func(key, options);
}

/** A function for getting the translation values from under a particular key prefix. */
export type LangPrefixFunc = (subKey: string, options?: TOptions) => string;

function isLangPrefixParams(
  params: Parameters<LangEntryFunc> | Parameters<LangPrefixFunc>,
): params is Parameters<LangPrefixFunc> {
  return typeof params[0] === "string";
}

export function createTranslationsFromPrefix<S extends string>(
  prefix: string,
  suffixes: S[],
): Record<S, LangEntryFunc & LangPrefixFunc> {
  const langFunc = useLangFunc();
  const result: Partial<Record<S, LangEntryFunc & LangPrefixFunc>> = {};
  for (const suffix of suffixes)
    result[suffix] = (...params: Parameters<LangEntryFunc> | Parameters<LangPrefixFunc>) => {
      const [subKey, options] = isLangPrefixParams(params) ? params : [undefined, params[0]];
      return langFunc(`${prefix}.${suffix}${subKey ? `.${subKey}` : ""}`, options);
    };
  return result as Record<S, LangEntryFunc & LangPrefixFunc>;
}
