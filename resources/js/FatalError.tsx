import {DateTime} from "luxon";
import {Show, VoidComponent, createEffect, onMount} from "solid-js";
import {Button} from "./components/ui/Button";
import {FullScreenPre} from "./components/ui/FullScreenPre";
import {withNoThrowOnInvalid} from "./components/utils";
import {isDEV} from "./components/utils/dev_mode";
import {MemoTitle} from "./features/root/MemoTitle";

interface Props {
  readonly error: unknown;
  readonly reset: () => void;
}

const RELOAD_MESSAGE_PATTERN = /^TypeError: Failed to fetch dynamically imported module: /;

const LAST_RELOAD_KEY = "FatalError:last_reload";

const MIN_RELOAD_INTERVAL_MILLIS = 30_000;

/** An information about an uncaught exception in the app frontend. */
export const FatalError: VoidComponent<Props> = (props) => {
  const message = () => (props.error instanceof Error && props.error.stack) || String(props.error);
  onMount(() => {
    let reloadNow = true;
    const lastReloadStr = localStorage.getItem(LAST_RELOAD_KEY);
    if (lastReloadStr) {
      const lastReload = withNoThrowOnInvalid(() => DateTime.fromISO(lastReloadStr));
      if (lastReload.isValid && DateTime.now().toMillis() - lastReload.toMillis() < MIN_RELOAD_INTERVAL_MILLIS) {
        reloadNow = false;
      }
    }
    if (reloadNow) {
      localStorage.setItem(LAST_RELOAD_KEY, DateTime.now().toISO());
      location.reload();
    }
  });
  // eslint-disable-next-line solid/reactivity
  import.meta.hot?.on("vite:afterUpdate", () => props.reset());
  createEffect(() => {
    if (RELOAD_MESSAGE_PATTERN.test(message()) && !isDEV()) {
      // It should be a transient issue, caused e.g. by a backend restart.
      location.reload();
    }
  });
  return (
    <>
      <MemoTitle title="Fatal Error" />
      <FullScreenPre class="text-red-700">
        {message()}
        <Show when={isDEV()}>
          <div class="absolute bottom-1 right-1 flex gap-1">
            <Button class="p-2 border rounded border-red-700 bg-white" onClick={() => props.reset()}>
              Retry
            </Button>
          </div>
        </Show>
      </FullScreenPre>
    </>
  );
};
