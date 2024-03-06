import {VoidComponent} from "solid-js";
import {FullScreenPre} from "./components/ui/FullScreenPre";

interface Props {
  readonly error: unknown;
}

/** An information about an uncaught exception catched in the app frontend. */
export const FatalError: VoidComponent<Props> = (props) => {
  const message = () => (props.error instanceof Error && props.error.stack) || String(props.error);
  return <FullScreenPre class="text-red-700">{message()}</FullScreenPre>;
};
