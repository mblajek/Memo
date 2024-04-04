import {createContext, useContext} from "solid-js";

export const LocaleContext = createContext<Intl.Locale>();

export function useLocale() {
  const locale = useContext(LocaleContext);
  if (!locale) {
    throw new Error("useLocale must be used within a LocaleContext.Provider");
  }
  return locale;
}
