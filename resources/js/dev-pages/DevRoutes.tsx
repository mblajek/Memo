import {Route} from "@solidjs/router";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {DEV, Show, VoidComponent} from "solid-js";

const AttributesPage = lazyAutoPreload(() => import("dev-pages/AttributesPage"));
const CrashPage = lazyAutoPreload(() => import("dev-pages/CrashPage"));
const DictionariesPage = lazyAutoPreload(() => import("dev-pages/DictionariesPage"));
const TestPage = lazyAutoPreload(() => import("dev-pages/TestPage"));

export const DevRoutes: VoidComponent = () => (
  <Route path="/dev">
    <Route path="/attributes" component={AttributesPage} />
    <Route path="/dictionaries" component={DictionariesPage} />
    <Route path="/crash" component={CrashPage} />
    <Show when={DEV}>
      <Route path="/test-page" component={TestPage} />
    </Show>
  </Route>
);
