import { useTransContext } from "@mbarzda/solid-i18next";
import { TOptions } from "i18next";

/**
 * A wrapper for useTransContext with the basic overload options, and with better
 * types for usage as TSX attributes (no null returned).
 */
export function getLangFunc() {
  const [t] = useTransContext();
  return (key: string | string[], options?: TOptions) =>
    options ? t(key, options) : t(key);
}
