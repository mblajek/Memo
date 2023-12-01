import {A, Route, useParams} from "@solidjs/router";
import {clearAllLocalStorageStorages, setLocalStoragePersistenceVersionComponent} from "components/persistence/storage";
import {FullScreenPre} from "components/ui/FullScreenPre";
import {VoidComponent} from "solid-js";
import {cx} from "../components/utils";

/** A collection of routes for safe backdoor operations, allowed also in prod mode and without any authorisation. */
export const BackdoorRoutes: VoidComponent = () => {
  const DARK_MODE_CLASS = "bg-black text-gray-200";
  return (
    <Route path="/dev">
      <Route path="/local-storage">
        <Route
          path="/"
          element={
            <FullScreenPre class={DARK_MODE_CLASS}>
              Local storage:
              <ul class="list-disc list-inside">
                <li>
                  <A href="/dev/local-storage/get">get the current content</A>
                </li>
                <li>
                  <A href="/dev/local-storage/clear">clear all keys</A>
                </li>
                <li>
                  <A href="/dev/local-storage/clear-persistence">clear the persistence entries</A>
                </li>
                <li>
                  <A href="/dev/local-storage/set-local-storage-persistence-version-component/-1">
                    disable local storage persistence
                  </A>
                </li>
              </ul>
            </FullScreenPre>
          }
        />
        <Route
          path="/get"
          element={
            <FullScreenPre class={cx(DARK_MODE_CLASS, "text-xs")}>
              <div class="text-red-500">
                <p>
                  UWAGA: Upewnij się, że przed przesłaniem komukolwiek poniższej zawartości, usuniesz z niej dane
                  osobowe!
                </p>
                <p>
                  WARNING: Make sure you remove any personal data from the content below before sending it to anyone!
                </p>
              </div>
              <br />
              {JSON.stringify(localStorage, undefined, 2)}
            </FullScreenPre>
          }
        />
        <Route
          path="/clear"
          component={() => {
            localStorage.clear();
            return <FullScreenPre class={DARK_MODE_CLASS}>Local storage cleared.</FullScreenPre>;
          }}
        />
        <Route
          path="/clear-persistence"
          component={() => {
            clearAllLocalStorageStorages();
            return <FullScreenPre class={DARK_MODE_CLASS}>Local storage persistence cleared.</FullScreenPre>;
          }}
        />
        <Route
          path="/set-local-storage-persistence-version-component/:versionComponent"
          component={() => {
            const params = useParams();
            const versionComponent = Number(params.versionComponent);
            setLocalStoragePersistenceVersionComponent(versionComponent);
            return (
              <FullScreenPre class={DARK_MODE_CLASS}>
                Local storage persistence version component set to {versionComponent}.
              </FullScreenPre>
            );
          }}
        />
      </Route>
    </Route>
  );
};
