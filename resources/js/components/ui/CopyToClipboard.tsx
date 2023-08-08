import {BiRegularCopy} from "solid-icons/bi";
import {Component, ParentProps, Show, createSignal} from "solid-js";
import {css} from ".";
import {useLangFunc} from "../utils";

interface Props {
  text: string;
}

/** A "Copy to clipboard" icon, copying the specified text on click. */
export const CopyToClipboard: Component<ParentProps<Props>> = (props) => {
  const t = useLangFunc();
  const [copied, setCopied] = createSignal(false);
  return (
    <Show when={props.text}>
      <span title={t("copy_to_clipboard")}>
        <BiRegularCopy
          class={css.inlineIcon}
          classList={{"text-black": true, "text-opacity-30": !copied()}}
          fill="currentColor"
          onClick={() => {
            navigator.clipboard.writeText(props.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 350);
          }}
        />
      </span>
    </Show>
  );
};
