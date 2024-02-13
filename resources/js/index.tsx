/* @refresh reload */
import {TransProvider} from "@mbarzda/solid-i18next";
import {MetaProvider} from "@solidjs/meta";
import {InitializeTanstackQuery} from "components/utils";
import {Settings} from "luxon";
import {DEV, ErrorBoundary, Show} from "solid-js";
import {DelegatedEvents, render} from "solid-js/web";
import {Toaster} from "solid-toast";
import App from "./App";
import {FatalError} from "./FatalError";
import {LoaderInPortal, MemoLoader} from "./components/ui/MemoLoader";
import {GlobalPageElements} from "./components/utils/GlobalPageElements";
import {LocaleContext} from "./components/utils/LocaleContext";
import {translationsLoaded} from "./i18n_loader";
import "./index.scss";

const root = document.getElementById("root");

if (!(root instanceof HTMLElement)) throw new Error("Root element not found.");

const TOAST_DURATION_SECS = 10;

Settings.throwOnInvalid = true;
declare module "luxon" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

// Allow stopping propagation of events (see https://github.com/solidjs/solid/issues/1786#issuecomment-1694589801).
DelegatedEvents.clear();

render(() => {
  return (
    <TransProvider
      options={{
        backend: {
          loadPath: "/api/v1/system/translation/{{lng}}/list",
        },
        debug: !!DEV,
        fallbackLng: false,
        initImmediate: false,
        lng: "pl",
        load: "currentOnly",
        supportedLngs: ["pl", "en-US"],
        pluralSeparator: "__",
      }}
    >
      <LocaleContext.Provider value={new Intl.Locale("pl")}>
        <Show when={!translationsLoaded()}>
          {/* Show the loader until the translations are loaded. The page is displayed underneath, and
        the strings will get updated reactively when the translations are ready. */}
          <MemoLoader />
        </Show>
        <ErrorBoundary
          fallback={(error) => {
            console.error(error);
            return <FatalError error={error} />;
          }}
        >
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "mr-4",
              duration: TOAST_DURATION_SECS * 1000,
            }}
          />
          <MetaProvider>
            <InitializeTanstackQuery>
              <App />
            </InitializeTanstackQuery>
          </MetaProvider>
          <GlobalPageElements />
          <LoaderInPortal />
        </ErrorBoundary>
      </LocaleContext.Provider>
    </TransProvider>
  );
}, root);
