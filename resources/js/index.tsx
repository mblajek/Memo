/* @refresh reload */
import { TransProvider } from "@mbarzda/solid-i18next";
import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { InitializeTanstackQuery } from "components/utils";
import i18next from "i18next";
import I18NextHttpBackend from "i18next-http-backend";
import { Show, createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Toaster } from "solid-toast";
import App from "./App";
import "./index.scss";

const root = document.getElementById("root");

if (!(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?"
  );
}

render(() => {
  const [transLoaded, setTransLoaded] = createSignal(false);
  i18next.use(I18NextHttpBackend);

  createEffect(() => i18next.on("loaded", () => setTransLoaded(true)));

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
      }}
    >
      <Show when={transLoaded()}>
        <MetaProvider>
          <InitializeTanstackQuery>
            <Router>
              <App />
              <Toaster
                position="bottom-right"
                toastOptions={{ className: "mr-4" }}
              />
            </Router>
          </InitializeTanstackQuery>
        </MetaProvider>
      </Show>
    </TransProvider>
  );
}, root!);
