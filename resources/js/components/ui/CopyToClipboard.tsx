import {BiRegularCopy} from "solid-icons/bi";
import {Show, VoidComponent, createSignal} from "solid-js";
import {cx, useLangFunc} from "../utils";
import {Button} from "./Button";

interface Props {
  readonly text: string | undefined;
  /** Whether the text should be displayed on hover. */
  readonly textInTitle?: boolean;
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
            class={cx("inlineIcon", copied() ? undefined : "dimmed")}
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
