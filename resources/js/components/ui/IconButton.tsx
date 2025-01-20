import {ButtonLike, ButtonLikeProps} from "components/ui/ButtonLike";
import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {IconTypes} from "solid-icons";
import {createSignal, splitProps, VoidComponent} from "solid-js";

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
