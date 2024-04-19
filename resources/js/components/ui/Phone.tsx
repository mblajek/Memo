import {FaSolidPhone} from "solid-icons/fa";
import {Show, VoidComponent, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {EmptyValueSymbol} from "./symbols";

interface Props extends htmlAttributes.span {
  readonly phone: string | undefined;
}

export const Phone: VoidComponent<Props> = (allProps) => {
  const [props, spanProps] = splitProps(allProps, ["phone"]);
  // TODO: Consider spacing the digits, possibly using https://github.com/catamphetamine/libphonenumber-js
  return (
    <span {...spanProps}>
      <Show when={props.phone} fallback={<EmptyValueSymbol />}>
        <FaSolidPhone class="inlineIcon" />
        &nbsp;<span class="overflow-hidden">{props.phone}&nbsp;</span>
      </Show>
    </span>
  );
};
