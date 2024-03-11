import {VoidComponent} from "solid-js";
import {Button} from "./components/ui/Button";
import {FullScreenPre} from "./components/ui/FullScreenPre";
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
        <Button
          class="absolute bottom-1 right-1 px-1 border rounded border-red-700 bg-white"
          onClick={() => props.reset()}
        >
          Retry
        </Button>
      </FullScreenPre>
    </>
  );
};
