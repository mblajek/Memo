import {createMutation} from "@tanstack/solid-query";
import {AxiosError, isAxiosError} from "axios";
import {DateTime} from "luxon";
import {Match, Show, Switch, VoidComponent, createMemo, createSignal, onMount} from "solid-js";
import {Button} from "./components/ui/Button";
import {FullScreenPre} from "./components/ui/FullScreenPre";
import {SmallSpinner} from "./components/ui/Spinner";
import {withNoThrowOnInvalid} from "./components/utils";
import {isDEV} from "./components/utils/dev_mode";
import {System} from "./data-access/memo-api/groups";
import {Api} from "./data-access/memo-api/types";
import {MemoTitle} from "./features/root/MemoTitle";

interface Props {
  readonly error: unknown;
  readonly reset: () => void;
}

const RELOAD_MESSAGE_PATTERN = /^TypeError: Failed to fetch dynamically imported module: /;

const LAST_RELOAD_KEY = "FatalError:last_reload";

const MIN_RELOAD_INTERVAL_MILLIS = 30_000;

const MAX_CONTEXT_LENGTH = 150_000;

/** An information about an uncaught exception in the app frontend. */
export const FatalError: VoidComponent<Props> = (props) => {
  // eslint-disable-next-line solid/reactivity
  import.meta.hot?.on("vite:afterUpdate", () => props.reset());
  const error = createMemo(() => {
    const fullMessage = (
      props.error instanceof Error ? props.error.stack || props.error.message : String(props.error)
    ).trim();
    const headLines = fullMessage.split("\n", 2);
    return {
      head: headLines.join("\n").trim(),
      full: fullMessage,
      tail: fullMessage.slice(headLines.reduce((a, l) => a + l.length + 1, 0)),
    };
  });
  const [loggingSkipped, setLoggingSkipped] = createSignal(false);
  const logMutation = createMutation(() => ({
    mutationFn: System.log,
    onSettled: () => {
      reloadIfNotRepetitive();
    },
  }));
  function reloadIfNotRepetitive() {
    const lastReloadStr = localStorage.getItem(LAST_RELOAD_KEY);
    if (lastReloadStr) {
      const lastReload = withNoThrowOnInvalid(() => DateTime.fromISO(lastReloadStr));
      if (lastReload.isValid && DateTime.now().toMillis() - lastReload.toMillis() < MIN_RELOAD_INTERVAL_MILLIS) {
        return;
      }
    }
    localStorage.setItem(LAST_RELOAD_KEY, DateTime.now().toISO());
    location.reload();
  }
  onMount(() => {
    const {head, full} = error();
    if (RELOAD_MESSAGE_PATTERN.test(head)) {
      // Skip logging to backend.
      setLoggingSkipped(true);
      reloadIfNotRepetitive();
      return;
    }
    logMutation.mutate({logLevel: "critical", message: head, context: full.slice(0, MAX_CONTEXT_LENGTH).trimEnd()});
  });
  return (
    <>
      <MemoTitle title="Fatal Error" />
      <FullScreenPre class="text-red-700">
        <div class="flex flex-col gap-2">
          <div>
            <div class="font-bold">{error().head}</div>
            <div>{error().tail}</div>
          </div>
          <div class="text-sm">
            <div>Logging the error to server:</div>
            <div>
              <Switch fallback="?">
                <Match when={loggingSkipped()}>skipped</Match>
                <Match when={logMutation.isPending}>
                  pending <SmallSpinner />
                </Match>
                <Match when={logMutation.error}>
                  {(error) => (
                    <div>
                      <div>logging request failed:</div>
                      <div>{error().stack || error().message}</div>
                      <Show when={isAxiosError(error())}>
                        <div>
                          {JSON.stringify(
                            ((error() as AxiosError).response?.data as Api.ErrorResponse | undefined)?.errors,
                          )}
                        </div>
                      </Show>
                    </div>
                  )}
                </Match>
                <Match when={logMutation.data}>
                  {(data) => <div>success: {JSON.stringify(data().data.data)}</div>}
                </Match>
              </Switch>
            </div>
          </div>
        </div>
        <Show when={isDEV()}>
          <div class="fixed bottom-4 right-4 flex gap-1">
            <Button class="p-2 border rounded border-red-700 bg-white" onClick={() => props.reset()}>
              Retry
            </Button>
          </div>
        </Show>
      </FullScreenPre>
    </>
  );
};
