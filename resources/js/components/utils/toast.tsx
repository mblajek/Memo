import {For} from "solid-js";
import toast from "solid-toast";
import {cx} from "./classnames";

export function toastMessages(messages: string[], toastFunction = toast.success) {
  if (messages.length) {
    toastFunction(() => (
      <ul class={cx({"list-disc list-inside": messages.length > 1}, "wrapText")}>
        <For each={messages}>{(msg) => <li>{msg}</li>}</For>
      </ul>
    ));
  }
}
