import {A, AnchorProps} from "@solidjs/router";
import {ImInfo} from "solid-icons/im";
import {Component, JSX, Match, Switch} from "solid-js";
import {htmlAttributes, useLangFunc} from "../utils";
import {Button} from "./Button";
import {ChildrenOrFunc, getChildrenElement} from "./children_func";
import {title} from "./title";

const _DIRECTIVES_ = null && title;

interface ButtonProps extends Omit<htmlAttributes.button, "children"> {
  readonly href?: undefined;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

interface LinkProps extends Omit<AnchorProps, "children"> {
  readonly href: string;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

export type InfoIconProps = ButtonProps | LinkProps;

/**
 * A tiny blue (i) icon providing more information to a control it is next to.
 * It can be a button, or an internal or external link. The link opens in a new tab by default.
 */
export const InfoIcon: Component<InfoIconProps> = (props) => {
  const t = useLangFunc();
  const icon = <ImInfo class="inlineIcon !mb-0.5 text-blue-500" size="16" />;
  const titleContent = () => props.title ?? t("more_info");
  return (
    <Switch>
      <Match when={props.href && props}>
        {(linkProps) => (
          <span use:title={titleContent()}>
            <A
              target="_blank"
              {...(linkProps() as AnchorProps)}
              onClick={(e) => {
                // If the info icon is on an active element, we generally don't want to pass the click.
                // TODO: Investigate why this doesn't work.
                e.stopPropagation();
              }}
              title=""
            >
              {getChildrenElement(props.children, icon) || icon}
            </A>
          </span>
        )}
      </Match>
      <Match when={!props.href && props}>
        {(buttonProps) => (
          <Button title={titleContent()} {...buttonProps}>
            {getChildrenElement(props.children, icon) || icon}
          </Button>
        )}
      </Match>
    </Switch>
  );
};
