import {useTransContext} from "@mbarzda/solid-i18next";
import {TOptions} from "i18next";

const MISSING_TRANSLATION_KEY_TEXT = "#MISSING#TRANSLATION#KEY#";

/**
 * Returns a function for extracting the translations.
 *
 * Provides a default value to easily notice if a translation key is missing.
 *
 * The wrapper also helps with the return type. Using `useTransContext()` directly when
 * specifying values for TSX attributes causes type errors related to possible null return value
 * in some cases.
 */
export function getLangFunc() {
  const [t] = useTransContext();
  return (key: string, options?: string | TOptions) =>
    t(key, MISSING_TRANSLATION_KEY_TEXT, options);
}
