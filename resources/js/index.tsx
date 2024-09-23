/* @refresh reload */
import {TransProvider} from "@mbarzda/solid-i18next";
import {MetaProvider} from "@solidjs/meta";
import {InitializeTanstackQuery} from "components/utils";
import {DEV, ErrorBoundary, Show} from "solid-js";
import {DelegatedEvents, render} from "solid-js/web";
import {Toaster} from "solid-toast";
import {TimeZoneController} from "time_zone_controller";
import App from "./App";
import {FatalError} from "./FatalError";
import {LoaderInPortal, MemoLoader} from "./components/ui/MemoLoader";
import {GlobalPageElements} from "./components/utils/GlobalPageElements";
import {LocaleContext} from "./components/utils/LocaleContext";
import {DictionariesAndAttributesProvider} from "./data-access/memo-api/dictionaries_and_attributes_context";
import {translationsLoaded} from "./i18n_loader";
import "./index.scss";
import {luxonInit} from "./luxon_init";

const root = document.getElementById("root");
if (!(root instanceof HTMLElement)) {
  throw new Error("Root element not found.");
}

const TOAST_DURATION_SECS = 10;

luxonInit();

// Allow stopping propagation of events (see https://github.com/solidjs/solid/issues/1786#issuecomment-1694589801).
DelegatedEvents.clear();

render(() => {
  return (
    <TransProvider
      options={{
        backend: {loadPath: "/api/v1/system/translation/{{lng}}/list"},
        debug: !!DEV,
        initImmediate: false,
        fallbackLng: "pl",
        load: "currentOnly",
        supportedLngs: ["pl"],
        pluralSeparator: "__",
      }}
    >
      <LocaleContext.Provider value={new Intl.Locale(navigator.language)}>
        <Show when={!translationsLoaded()}>
          {/* Show the loader until the translations are loaded. The page is displayed underneath, and
        the strings will get updated reactively when the translations are ready. */}
          <MemoLoader />
        </Show>
        <MetaProvider>
          <ErrorBoundary
            fallback={(error, reset) => {
              console.error(error);
              return <FatalError error={error} reset={reset} />;
            }}
          >
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "mr-4 !pr-0",
                duration: TOAST_DURATION_SECS * 1000,
              }}
            />
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
        </MetaProvider>
      </LocaleContext.Provider>
    </TransProvider>
  );
}, root);
