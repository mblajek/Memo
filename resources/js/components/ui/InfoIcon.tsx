import {A, AnchorProps} from "@solidjs/router";
import {ImInfo} from "solid-icons/im";
import {Component, JSX, Match, Switch} from "solid-js";
import {htmlAttributes, useLangFunc} from "../utils";
import {Button} from "./Button";
import {ChildrenOrFunc, getChildrenElement} from "./children_func";
import {title} from "./title";

const _DIRECTIVES_ = null && title;

interface LinkProps extends Omit<AnchorProps, "children"> {
  readonly href: string;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

interface ButtonProps
  extends Omit<htmlAttributes.button, "children" | "onClick">,
    Required<Pick<htmlAttributes.button, "onClick">> {
  readonly href?: undefined;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

interface TitleProps extends Omit<htmlAttributes.span, "children"> {
  readonly href?: undefined;
  readonly onClick?: undefined;
  readonly title: string;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

export type InfoIconProps = LinkProps | ButtonProps | TitleProps;

function isLinkProps(pr: InfoIconProps): pr is LinkProps {
  return !!pr.href;
}

function isButtonProps(pr: InfoIconProps): pr is ButtonProps {
  return !pr.href && !!pr.onClick;
}

function isTitleProps(pr: InfoIconProps): pr is TitleProps {
  return !pr.href && !pr.onClick;
}

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
      <Match when={isLinkProps(props) && props}>
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
      <Match when={isButtonProps(props) && props}>
        {(buttonProps) => (
          <Button title={titleContent()} {...buttonProps}>
            {getChildrenElement(props.children, icon) || icon}
          </Button>
        )}
      </Match>
      <Match when={isTitleProps(props) && props}>
        {(titleProps) => (
          <span tabindex="0" use:title={titleContent()} {...titleProps()} title="">
            {getChildrenElement(titleProps().children, icon) || icon}
          </span>
        )}
      </Match>
    </Switch>
  );
};
