/* @refresh reload */
import {TransProvider} from "@mbarzda/solid-i18next";
import {MetaProvider} from "@solidjs/meta";
import {Router} from "@solidjs/router";
import {InitializeTanstackQuery} from "components/utils";
import {Settings} from "luxon";
import {Show} from "solid-js";
import {render} from "solid-js/web";
import {Toaster} from "solid-toast";
import App from "./App";
import {LoaderInPortal, MemoLoader} from "./components/ui";
import {translationsLoaded} from "./i18n_loader";
import "./index.scss";

const root = document.getElementById("root");

if (!(root instanceof HTMLElement)) throw new Error("Root element not found.");

const TOAST_DURATION_SECS = 8;

Settings.throwOnInvalid = true;
declare module "luxon" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

render(() => {
  return (
    <TransProvider
      options={{
        backend: {
          loadPath: "/api/v1/system/translation/{{lng}}/list",
        },
        debug: true,
        fallbackLng: false,
        initImmediate: false,
        lng: "pl",
        load: "currentOnly",
        supportedLngs: ["pl", "en-US"],
        pluralSeparator: "__",
      }}
    >
      <Show when={!translationsLoaded()}>
        {/* Show the loader until the translations are loaded. The page is displayed underneath, and
        the strings will get updated reactively when the translations are ready. */}
        <MemoLoader />
      </Show>
      <MetaProvider>
        <InitializeTanstackQuery>
          <Router>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "mr-4",
                duration: TOAST_DURATION_SECS * 1000,
              }}
            />
          </Router>
        </InitializeTanstackQuery>
      </MetaProvider>
      <LoaderInPortal />
    </TransProvider>
  );
}, root);
