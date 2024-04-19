import {VsClose} from "solid-icons/vs";
import {For, JSX, Show, VoidComponent} from "solid-js";
import toast, {ToastHandler, ToastOptions} from "solid-toast";
import {Button} from "../ui/Button";
import {cx} from "./classnames";

type Message = string | (() => JSX.Element);

function showToast(toastFunction: ToastHandler, message: Message, options?: ToastOptions) {
  const id = toastFunction(
    () => (
      <div class="flex gap-2">
        {typeof message === "function" ? message() : message}
        <Button
          // TODO: Use translated text as the label. This is hard because we can't use useLangFunc here.
          aria-label="close"
          onClick={() => toast.dismiss(id)}
        >
          <VsClose size="24" class="text-black" />
        </Button>
      </div>
    ),
    options,
  );
  return id;
}

export function toastSuccess(message: Message, options?: ToastOptions) {
  return showToast(toast.success, message, options);
}

export function toastError(message: Message, options?: ToastOptions) {
  return showToast(toast.error, message, options);
}

interface ToastMessagesProps {
  readonly messages: readonly JSX.Element[];
}

export const ToastMessages: VoidComponent<ToastMessagesProps> = (props) => (
  <Show when={props.messages.length}>
    <ul class={cx({"list-disc list-inside": props.messages.length > 1}, "wrapText")}>
      <For each={props.messages}>{(msg) => <li class="wrapTextAnywhere">{msg}</li>}</For>
    </ul>
  </Show>
);
