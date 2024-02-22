import {useTransContext} from "@mbarzda/solid-i18next";
import {TOptions} from "i18next";
import {isDEV} from "./dev_mode";

/**
 * A function for getting the translation from a particular key. A list of keys can be used
 * to get the first available translation.
 */
export type LangFunc = (key: string | string[], options?: TOptions) => string;

/**
 * A wrapper for useTransContext with the basic overload options, and with better
 * types for usage as TSX attributes (no null returned).
 */
export function useLangFunc(): LangFunc {
  const transContext = useTransContext();
  if (!transContext) {
    throw new Error(`Called useLangFunc outside of the provider.`);
  }
  const [t] = transContext;
  return (key, options) => {
    if (typeof key === "string") {
      return options ? t(key, options) : t(key);
    }
    if (!key.length) {
      throw new Error(`Called useLangFunc with an empty key list.`);
    }
    // Check if the value is present under any of the keys, and return it if so.
    const value = t(key, {...options, defaultValue: MISSING_VALUE});
    if (value !== MISSING_VALUE) {
      return value;
    }
    // If it's not present, try using the translation mechanism normally, but provide a default value
    // listing all the keys, if the options don't have a default value.
    return t(key[0]!, {defaultValue: `??${isDEV() ? key.join("|") : key[0]}`, ...options});
  };
}

const MISSING_VALUE = "--__MISSING__--";
