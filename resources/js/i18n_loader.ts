import i18next from "i18next";
import I18NextHttpBackend from "i18next-http-backend";
import intervalPlural from "i18next-intervalplural-postprocessor";
import {createSignal} from "solid-js";

export const translationsLoadedPromise = new Promise((resolve) =>
  i18next.use(I18NextHttpBackend).use(intervalPlural).on("loaded", resolve),
);

const [getTranslationsLoaded, setTranslationsLoaded] = createSignal(false);
translationsLoadedPromise.then(() => setTranslationsLoaded(true));

export const translationsLoaded = getTranslationsLoaded;

const [getCurrentLanguage, setCurrentLanguage] = createSignal(i18next.resolvedLanguage);
i18next.on("languageChanged", setCurrentLanguage);

export const currentLanguage = getCurrentLanguage;
