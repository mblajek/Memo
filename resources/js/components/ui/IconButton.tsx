import {ButtonLike, ButtonLikeProps} from "components/ui/ButtonLike";
import {IconTypes} from "solid-icons";
import {createSignal, splitProps, VoidComponent} from "solid-js";
import {cx, htmlAttributes} from "../utils";

interface Props extends ButtonLikeProps {
  readonly icon: IconTypes;
}

const ACTIVE_TIME_MILLIS = 350;

export const IconButton: VoidComponent<Props> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["icon"]);
  const [active, setActive] = createSignal(false);
  return (
    <ButtonLike
      {...buttonProps}
      onClick={(e) => {
        htmlAttributes.callHandler(buttonProps.onClick, e);
        if (!active()) {
          setActive(true);
          setTimeout(() => setActive(false), ACTIVE_TIME_MILLIS);
        }
      }}
    >
      <props.icon class={cx("inlineIcon transition-colors", active() ? undefined : "dimmed")} />
    </ButtonLike>
  );
};
