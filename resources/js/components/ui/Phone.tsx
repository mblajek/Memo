import {FaSolidPhone} from "solid-icons/fa";
import {Show, VoidComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {EMPTY_VALUE_SYMBOL} from "./symbols";

interface Props extends htmlAttributes.span {
  readonly phone: string | undefined;
}

export const Phone: VoidComponent<Props> = (allProps) => {
  const [props, spanProps] = splitProps(allProps, ["phone"]);
  // TODO: Consider spacing the digits, possibly using https://github.com/catamphetamine/libphonenumber-js
  return (
    <span {...spanProps}>
      <Show when={props.phone} fallback={EMPTY_VALUE_SYMBOL}>
        <FaSolidPhone class="inlineIcon" />
        &nbsp;<span class="overflow-hidden">{props.phone}&nbsp;</span>
      </Show>
    </span>
  );
};
