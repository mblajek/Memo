import {Show, VoidComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {CopyToClipboard} from "./CopyToClipboard";
import {EmptyValueSymbol} from "./symbols";

interface Props extends htmlAttributes.span {
  readonly email: string | undefined;
}

/** A component for displaying a copiable email address. No mailto. */
export const Email: VoidComponent<Props> = (allProps) => {
  const [props, spanProps] = splitProps(allProps, ["email"]);
  return (
    <span {...htmlAttributes.merge(spanProps, {class: "inline-flex"})}>
      <Show when={props.email} fallback={<EmptyValueSymbol />}>
        <span class="overflow-hidden">{props.email}&nbsp;</span>
        <CopyToClipboard text={props.email} />
      </Show>
    </span>
  );
};
