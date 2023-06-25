/* @refresh reload */
import { TransProvider } from "@mbarzda/solid-i18next";
import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/solid-query";
import { isAxiosError } from "axios";
import i18next from "i18next";
import I18NextHttpBackend from "i18next-http-backend";
import { render } from "solid-js/web";
import toast, { Toaster } from "solid-toast";
import App from "./App";
import "./index.scss";

const root = document.getElementById("root");

if (!(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?"
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError(error, query) {
      if (isAxiosError<{ errors: { code: string }[] }>(error)) {
        if (query.meta?.quietError) return;
        error.response?.data.errors.forEach((error) =>
          toast.error(i18next.t(error.code))
        );
      }
    },
  }),
});

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
        <QueryClientProvider client={queryClient}>
          <Router>
            <App />
            <Toaster
              position="bottom-right"
              toastOptions={{ className: "mr-4" }}
            />
          </Router>
        </QueryClientProvider>
      </MetaProvider>
    </TransProvider>
  );
}, root!);
