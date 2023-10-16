import i18next from "i18next";
import I18NextHttpBackend from "i18next-http-backend";
import {createSignal} from "solid-js";

export const translationsLoadedPromise = new Promise((resolve) =>
  i18next.use(I18NextHttpBackend).on("loaded", resolve),
);

const [getTranslationsLoaded, setTranslationsLoaded] = createSignal(false);
translationsLoadedPromise.then(() => setTranslationsLoaded(true));

export const translationsLoaded = getTranslationsLoaded;
