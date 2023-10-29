import {A, AnchorProps} from "@solidjs/router";
import {ImInfo} from "solid-icons/im";
import {Match, Switch, VoidComponent} from "solid-js";
import {htmlAttributes, useLangFunc} from "../utils";
import {Button} from "./Button";

interface ButtonProps extends htmlAttributes.button {
  href?: undefined;
}

interface LinkProps extends AnchorProps {
  href: string;
}

type Props = ButtonProps | LinkProps;

/**
 * A tiny blue (i) icon providing more information to a control it is next to.
 * It can be a button, or an internal or external link.
 */
export const InfoIcon: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const icon = <ImInfo class="inlineIcon !mb-0.5 text-blue-500" size="16" />;
  return (
    <Switch>
      <Match when={props.href && props}>
        {(linkProps) => (
          <A
            title={t("more_info")}
            {...(linkProps() as AnchorProps)}
            onClick={(e) => {
              // If the info icon is on an active element, we generally don't want to pass the click.
              // TODO: Investigate why this doesn't work.
              e.stopPropagation();
            }}
          >
            {icon}
          </A>
        )}
      </Match>
      <Match when={!props.href && props}>
        {(buttonProps) => (
          <Button title={t("more_info")} {...buttonProps}>
            {icon}
          </Button>
        )}
      </Match>
    </Switch>
  );
};