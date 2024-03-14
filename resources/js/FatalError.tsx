import {Show, VoidComponent} from "solid-js";
import {Button} from "./components/ui/Button";
import {FullScreenPre} from "./components/ui/FullScreenPre";
import {isDEV} from "./components/utils/dev_mode";
import {MemoTitle} from "./features/root/MemoTitle";

interface Props {
  readonly error: unknown;
  readonly reset: () => void;
}

/** An information about an uncaught exception in the app frontend. */
export const FatalError: VoidComponent<Props> = (props) => {
  const message = () => (props.error instanceof Error && props.error.stack) || String(props.error);
  // eslint-disable-next-line solid/reactivity
  import.meta.hot?.on("vite:afterUpdate", () => props.reset());
  return (
    <>
      <MemoTitle title="Fatal Error" />
      <FullScreenPre class="text-red-700">
        {message()}
        <Show when={isDEV()}>
          <div class="absolute bottom-1 right-1 flex gap-1">
            <Button class="px-1 border rounded border-red-700 bg-white" onClick={() => location.reload()}>
              Reload
            </Button>
            <Button class="px-1 border rounded border-red-700 bg-white" onClick={() => props.reset()}>
              Retry
            </Button>
          </div>
        </Show>
      </FullScreenPre>
    </>
  );
};
