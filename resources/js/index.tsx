/* @refresh reload */
import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import i18next from "i18next";
import { TransProvider } from "@mbarzda/solid-i18next";
import I18NextHttpBackend from "i18next-http-backend";
import { Toaster } from "solid-toast";

import "./index.scss";
import App from "./App";
import { MetaProvider } from "@solidjs/meta";

const root = document.getElementById("root");

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
            debug: true,
            lng: "pl-PL",
            fallbackLng: false,
            supportedLngs: ["pl-PL", "en-US"],
            initImmediate: false,
            backend: {
                loadPath: "/api/v1/system/translation/{{lng}}/list",
            },
        }}
        >
            <MetaProvider>
                <Router>
                    <App />
                    <Toaster
                        position="bottom-right"
                        toastOptions={{ className: "mr-4" }}
                    />
                </Router>
            </MetaProvider>
        </TransProvider>
    );
}, root!);
