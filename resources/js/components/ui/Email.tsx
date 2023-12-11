import {Show, VoidComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {CopyToClipboard} from "./CopyToClipboard";
import {EMPTY_VALUE_SYMBOL} from "./symbols";

interface Props extends htmlAttributes.div {
  readonly email: string | undefined;
}

/** A component for displaying a copiable email address. No mailto. */
export const Email: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["email"]);
  return (
    <div {...htmlAttributes.merge(divProps, {class: "flex"})}>
      <Show when={props.email} fallback={EMPTY_VALUE_SYMBOL}>
        <span class="overflow-hidden">{props.email}&nbsp;</span>
        <CopyToClipboard text={props.email} />
      </Show>
    </div>
  );
};
