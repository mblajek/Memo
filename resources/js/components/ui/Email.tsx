import {Show, VoidComponent} from "solid-js";
import {CopyToClipboard} from "./CopyToClipboard";
import {EMPTY_VALUE_SYMBOL} from "./symbols";

interface Props {
  email: string | undefined;
}

/** A component for displaying a copiable email address. No mailto. */
export const Email: VoidComponent<Props> = (props) => (
  <Show when={props.email} fallback={EMPTY_VALUE_SYMBOL}>
    <div class="flex gap-1">
      {props.email}
      <CopyToClipboard text={props.email} />
    </div>
  </Show>
);
