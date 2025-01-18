import {ButtonLikeProps} from "components/ui/ButtonLike";
import {actionIcons} from "components/ui/icons";
import {Show, splitProps, VoidComponent} from "solid-js";
import {useLangFunc} from "../utils";
import {IconButton} from "./IconButton";

interface Props extends ButtonLikeProps {
  readonly text: string | undefined;
  /** Whether the text should be displayed on hover. */
  readonly textInTitle?: boolean;
  /** Whether to show the disabled button (as opposed to hiding it) when the text is empty. Default: false */
  readonly showDisabledOnEmpty?: boolean;
}

/** A "Copy to clipboard" icon, copying the specified text on click. */
export const CopyToClipboard: VoidComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["text", "textInTitle", "showDisabledOnEmpty"]);
  const t = useLangFunc();
  return (
    <Show when={props.text || props.showDisabledOnEmpty}>
      <IconButton
        {...buttonProps}
        icon={actionIcons.Copy}
        title={props.textInTitle ? `${t("actions.copy_to_clipboard")}\n${props.text}` : t("actions.copy_to_clipboard")}
        disabled={!props.text}
        onClick={() => navigator.clipboard.writeText(props.text!)}
      />
    </Show>
  );
};
