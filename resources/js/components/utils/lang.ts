import {useTransContext} from "@mbarzda/solid-i18next";
import {TOptions} from "i18next";
import {Accessor} from "solid-js";

/**
 * A wrapper for useTransContext with the basic overload options, and with better
 * types for usage as TSX attributes (no null returned).
 */
export function useLangFunc() {
  const [t] = useTransContext();
  return (key: string, options?: TOptions) => options ? t(key, options) : t(key);
}

/** A function for getting the translation value from a particular key. */
export type LangEntryFunc = (options?: TOptions) => string;

export function getLangEntryFunc(key: string): LangEntryFunc {
  const langFunc = useLangFunc();
  return options => langFunc(key, options);
}

/**
 * An instance of this class represents a structure of translation keys under a prefix.
 *
 * Example:
 *
 *     // Interface representing a group of translation keys "a" and "b":
 *     const MyTranslationsInterface = new TranslationEntriesInterface("a", "b");
 *
 *     // An instance of that interface for prefix "my.prefix":
 *     const myStrings = MyTranslationsInterface.forPrefix("my.prefix");
 *
 *     // Get the translation for key "my.prefix.a" (options are optional):
 *     myStrings.a(options)
 */
export class TranslationEntriesInterface<S extends string>{
  private readonly suffixes;

  constructor(...suffixes: S[]) {
    this.suffixes = suffixes;
  }

  forPrefix(prefix: string | Accessor<string>) {
    const prefixAccessor = typeof prefix === "function" ? prefix : () => prefix;
    const langFunc = useLangFunc();
    const result: Partial<Record<S, LangEntryFunc>> = {};
    for (const suffix of this.suffixes)
      result[suffix] = options => langFunc(`${prefixAccessor()}.${suffix}`, options);
    return result as Record<S, LangEntryFunc>;
  }
}

/**
 * A marker type for parameters or props that are translation entries prefix for the specified
 * TranslationEntriesInterface.
 *
 * Usage example (in a component):
 *
 *     const MyTranslationsInterface = new TranslationEntriesInterface("a", "b");
 *
 *     interface Props {
 *       translationsPrefix: TranslationEntriesPrefix<keyof MyTranslationsInterface>;
 *     }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TranslationEntriesPrefix<G extends TranslationEntriesInterface<string>> = string;
