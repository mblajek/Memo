/* @refresh reload */
import "./index.scss";
import "./init_luxon";
import "./init_solid";
import "./init_types";

import {TransProvider} from "@mbarzda/solid-i18next";
import {MetaProvider} from "@solidjs/meta";
import {AntiSelfXSSInfo} from "AntiSelfXSSInfo";
import {Toaster} from "Toaster";
import {InitializeTanstackQuery} from "components/utils/InitializeTanstackQuery";
import {AppTitleProvider} from "features/root/AppTitleProvider";
import {DEV, ErrorBoundary, Show} from "solid-js";
import {render} from "solid-js/web";
import {TimeZoneController} from "time_zone_controller";
import App from "./App";
import {FatalError} from "./FatalError";
import {LoaderInPortal, MemoLoader} from "./components/ui/MemoLoader";
import {GlobalPageElements} from "./components/utils/GlobalPageElements";
import {DictionariesAndAttributesProvider} from "./data-access/memo-api/dictionaries_and_attributes_context";
import {translationsLoaded} from "./i18n_loader";

const root = document.getElementById("root");
if (!(root instanceof HTMLElement)) {
  throw new Error("Root element not found.");
}

// Allow setting the language in the session storage, mostly for testing.
const LANGUAGE_SESSION_STORAGE_KEY = "language";

render(() => {
  return (
    <TransProvider
      lng={sessionStorage.getItem(LANGUAGE_SESSION_STORAGE_KEY) || undefined}
      options={{
        backend: {loadPath: "/api/v1/system/translation/{{lng}}/list"},
        debug: !!DEV,
        initImmediate: false,
        fallbackLng: "pl",
        load: "currentOnly",
        supportedLngs: ["pl", "testing"],
        pluralSeparator: "__",
        // The translated texts are always passed through the framework.
        interpolation: {escapeValue: false},
      }}
    >
      <AntiSelfXSSInfo />
      <Show when={!translationsLoaded()}>
        {/* Show the loader until the translations are loaded. The page is displayed underneath, and
        the strings will get updated reactively when the translations are ready. */}
        <MemoLoader />
      </Show>
      <MetaProvider>
        <AppTitleProvider>
          <ErrorBoundary
            fallback={(error, reset) => {
              console.error(error);
              return (
                <InitializeTanstackQuery>
                  <FatalError error={error} reset={reset} />
                </InitializeTanstackQuery>
              );
            }}
          >
            <Toaster />
            <InitializeTanstackQuery>
              <DictionariesAndAttributesProvider>
                <TimeZoneController>
                  <App />
                </TimeZoneController>
              </DictionariesAndAttributesProvider>
            </InitializeTanstackQuery>
            <GlobalPageElements />
            <LoaderInPortal />
          </ErrorBoundary>
        </AppTitleProvider>
      </MetaProvider>
    </TransProvider>
  );
}, root);
