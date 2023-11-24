import {VoidComponent} from "solid-js";

interface Props {
  readonly error: unknown;
}

/** An information about an uncaught exception catched in the app frontend. */
export const FatalError: VoidComponent<Props> = (props) => {
  const message = () => (props.error instanceof Error && props.error.stack) || String(props.error);
  return <pre class="p-1 text-red-700">{message()}</pre>;
};
