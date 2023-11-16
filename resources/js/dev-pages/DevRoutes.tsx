import {Route} from "@solidjs/router";
import {VoidComponent, lazy} from "solid-js";

const DictionariesPage = lazy(() => import("dev-pages/DictionariesPage"));
const TestPage = lazy(() => import("dev-pages/TestPage"));

export const DevRoutes: VoidComponent = () => (
  <Route path="/dev">
    <Route path="/dictionaries" component={DictionariesPage} />
    <Route path="/test-page" component={TestPage} />
  </Route>
);
