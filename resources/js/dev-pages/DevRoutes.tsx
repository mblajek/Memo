import {Route} from "@solidjs/router";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {VoidComponent} from "solid-js";

const AttributesPage = lazyAutoPreload(() => import("dev-pages/AttributesPage"));
const DictionariesPage = lazyAutoPreload(() => import("dev-pages/DictionariesPage"));
const TestPage = lazyAutoPreload(() => import("dev-pages/TestPage"));

export const DevRoutes: VoidComponent = () => (
  <Route path="/dev">
    <Route path="/attributes" component={AttributesPage} />
    <Route path="/dictionaries" component={DictionariesPage} />
    <Route path="/test-page" component={TestPage} />
  </Route>
);
