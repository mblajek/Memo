import {A, AnchorProps} from "@solidjs/router";
import {ImInfo} from "solid-icons/im";
import {Component, JSX, Match, Switch} from "solid-js";
import {htmlAttributes, useLangFunc} from "../utils";
import {ButtonProps} from "./Button";
import {ButtonLike} from "./ButtonLike";
import {ChildrenOrFunc, getChildrenElement} from "./children_func";
import {title} from "./title";

type _Directives = typeof title;

interface LinkVariantProps extends Omit<AnchorProps, "children"> {
  readonly href: string;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

interface ButtonVariantProps extends Omit<ButtonProps, "children" | "onClick">, Required<Pick<ButtonProps, "onClick">> {
  readonly href?: undefined;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

interface TitleVariantProps extends Omit<htmlAttributes.span, "children"> {
  readonly href?: undefined;
  readonly onClick?: undefined;
  readonly title?: string;
  readonly children?: ChildrenOrFunc<[JSX.Element]>;
}

export type InfoIconProps = LinkVariantProps | ButtonVariantProps | TitleVariantProps;

function isLinkProps(pr: InfoIconProps): pr is LinkVariantProps {
  return !!pr.href;
}

function isButtonProps(pr: InfoIconProps): pr is ButtonVariantProps {
  return !pr.href && !!pr.onClick;
}

function isTitleProps(pr: InfoIconProps): pr is TitleVariantProps {
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
          // Use ButtonLike to allow usage inside a disabled form.
          <ButtonLike title={titleContent()} {...buttonProps}>
            {getChildrenElement(props.children, icon) || icon}
          </ButtonLike>
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
