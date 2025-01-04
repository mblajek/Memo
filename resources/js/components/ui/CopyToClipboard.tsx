import {ButtonLikeProps} from "components/ui/ButtonLike";
import {BiRegularCopy} from "solid-icons/bi";
import {Show, splitProps, VoidComponent} from "solid-js";
import {useLangFunc} from "../utils";
import {IconButton} from "./IconButton";

interface Props extends ButtonLikeProps {
  readonly text: string | undefined;
  /** Whether the text should be displayed on hover. */
  readonly textInTitle?: boolean;
}

/** A "Copy to clipboard" icon, copying the specified text on click. */
export const CopyToClipboard: VoidComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["text", "textInTitle"]);
  const t = useLangFunc();
  return (
    <Show when={props.text}>
      {(text) => (
        <IconButton
          {...buttonProps}
          icon={BiRegularCopy}
          title={
            props.textInTitle ? `${t("actions.copy_to_clipboard")}\n${props.text}` : t("actions.copy_to_clipboard")
          }
          onClick={() => {
            navigator.clipboard.writeText(text());
          }}
        />
      )}
    </Show>
  );
};
