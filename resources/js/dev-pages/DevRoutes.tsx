import {Route} from "@solidjs/router";
import {SilentAccessBarrier} from "components/utils/AccessBarrier";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {DEV, Show, VoidComponent} from "solid-js";

const AttributesPage = lazyAutoPreload(() => import("dev-pages/AttributesPage"));
const CrashPage = lazyAutoPreload(() => import("dev-pages/CrashPage"));
const DevFeatureUsePage = lazyAutoPreload(() => import("dev-pages/DevFeatureUsePage"));
const DevLogsPage = lazyAutoPreload(() => import("dev-pages/DevLogsPage"));
const DevPreloadStatusesPage = lazyAutoPreload(() => import("dev-pages/DevPreloadStatusesPage"));
const DictionariesPage = lazyAutoPreload(() => import("dev-pages/DictionariesPage"));
const DictionaryPage = lazyAutoPreload(() => import("dev-pages/DictionaryPage"));
const TestPage = lazyAutoPreload(() => import("dev-pages/TestPage"));

export const DevRoutes: VoidComponent = () => (
  <Route path="/dev">
    <Route path="/attributes" component={AttributesPage} />
    <Route path="/dictionaries">
      <Route path="/" component={DictionariesPage} />
      <Route path="/:dictionaryId" component={DictionaryPage} />
    </Route>
    <SilentAccessBarrier roles={["developer"]}>
      <Route path="/logs" component={DevLogsPage} />
      <Route path="/feature-use" component={DevFeatureUsePage} />
    </SilentAccessBarrier>
    <Route path="/crash" component={CrashPage} />
    <Route path="/preload-statuses" component={DevPreloadStatusesPage} />
    <Show when={DEV}>
      <Route path="/test-page" component={TestPage} />
    </Show>
  </Route>
);
