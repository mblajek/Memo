import {BiRegularCopy} from "solid-icons/bi";
import {Component, ParentProps, Show, createSignal} from "solid-js";
import {Button} from ".";
import {useLangFunc} from "../utils";

interface Props {
  text: string | undefined;
}

/** A "Copy to clipboard" icon, copying the specified text on click. */
export const CopyToClipboard: Component<ParentProps<Props>> = (props) => {
  const t = useLangFunc();
  const [copied, setCopied] = createSignal(false);
  return (
    <Show when={props.text}>
      {(text) => (
        <Button title={t("copy_to_clipboard")}>
          <BiRegularCopy
            class="inlineIcon"
            classList={{dimmed: !copied()}}
            onClick={() => {
              navigator.clipboard.writeText(text());
              setCopied(true);
              setTimeout(() => setCopied(false), 350);
            }}
          />
        </Button>
      )}
    </Show>
  );
};
