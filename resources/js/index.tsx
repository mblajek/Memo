/* @refresh reload */
import { TransProvider } from "@mbarzda/solid-i18next";
import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import i18next from "i18next";
import I18NextHttpBackend from "i18next-http-backend";
import { render } from "solid-js/web";
import { Toaster } from "solid-toast";
import App from "./App";
import "./index.scss";

const root = document.getElementById("root");

const queryClient = new QueryClient();

if (!(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?"
  );
}

render(() => {
  i18next.use(I18NextHttpBackend);

  return (
    <TransProvider
      options={{
        backend: {
          loadPath: "/api/v1/system/translation/{{lng}}/list",
        },
        debug: true,
        fallbackLng: false,
        initImmediate: false,
        lng: "pl-PL",
        supportedLngs: ["pl-PL", "en-US"],
      }}
    >
      <MetaProvider>
        <Router>
          <QueryClientProvider client={queryClient}>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{ className: "mr-4" }}
            />
          </QueryClientProvider>
        </Router>
      </MetaProvider>
    </TransProvider>
  );
}, root!);
