import {BiRegularCopy} from "solid-icons/bi";
import {Component, ParentProps, Show, createSignal} from "solid-js";
import {Button, css} from ".";
import {useLangFunc} from "../utils";

interface Props {
  text: string | undefined;
  /** Whether the text should be displayed on hover. */
  textInTitle?: boolean;
}

/** A "Copy to clipboard" icon, copying the specified text on click. */
export const CopyToClipboard: Component<ParentProps<Props>> = (props) => {
  const t = useLangFunc();
  const [copied, setCopied] = createSignal(false);
  return (
    <Show when={props.text}>
      {(text) => (
        <Button title={props.textInTitle ? `${t("copy_to_clipboard")}\n${props.text}` : t("copy_to_clipboard")}>
          <BiRegularCopy
            class={css.inlineIcon}
            classList={{"text-black": true, "text-opacity-30": !copied()}}
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
