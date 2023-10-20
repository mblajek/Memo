import {BiRegularCopy} from "solid-icons/bi";
import {Show, VoidComponent, createSignal} from "solid-js";
import {useLangFunc} from "../utils";
import {Button} from "./Button";

interface Props {
  text: string | undefined;
  /** Whether the text should be displayed on hover. */
  textInTitle?: boolean;
}

/** A "Copy to clipboard" icon, copying the specified text on click. */
export const CopyToClipboard: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const [copied, setCopied] = createSignal(false);
  return (
    <Show when={props.text}>
      {(text) => (
        <Button
          title={
            props.textInTitle ? `${t("actions.copy_to_clipboard")}\n${props.text}` : t("actions.copy_to_clipboard")
          }
        >
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
