import {Show, VoidComponent} from "solid-js";
import {CopyToClipboard} from "../CopyToClipboard";
import {EmptyValueSymbol} from "../symbols";

interface Props {
  readonly id: string | undefined;
}

/** A component for displaying a copiable id, truncated to take less space. */
export const IdColumn: VoidComponent<Props> = (props) => (
  <Show when={props.id} fallback={<EmptyValueSymbol />}>
    <div class="w-full flex items-center">
      <span class="overflow-hidden whitespace-nowrap text-ellipsis font-mono" style={{direction: "rtl"}}>
        {props.id}
      </span>
      <CopyToClipboard text={props.id} textInTitle />
    </div>
  </Show>
);
