import {AnchorProps} from "@solidjs/router";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {SmallSpinner} from "components/ui/Spinner";
import {CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {EmptyValueSymbol} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {Api} from "data-access/memo-api/types";
import {FacilityUserType, useUserDisplayNames} from "data-access/memo-api/user_display_names";
import {Match, Show, Switch, VoidComponent, splitProps} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

interface Props extends Partial<AnchorProps> {
  readonly type: FacilityUserType;
  /** Whether to display the staff/client icon. Default: true. */
  readonly icon?: boolean | "tiny";
  /** Whether to linkify the name. Default: true. */
  readonly link?: boolean;
  readonly userId: Api.Id | undefined;
  /** The user's display name, if known (otherwise it is fetched). */
  readonly name?: string;
}

export const UserLink: VoidComponent<Props> = (allProps) => {
  const [props, anchorProps] = splitProps(allProps, ["type", "icon", "link", "userId", "name"]);
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const userDisplayNames = useUserDisplayNames();
  const name = () => (props.name ? {displayName: props.name} : userDisplayNames.get(props.type, props.userId!));
  const icon = () => props.icon ?? true;
  const ICON_STYLE_PROPS = {
    class: "inlineIcon shrink-0 text-current",
    style: {"margin-right": "0.1em", "margin-bottom": "0.1em"},
  };
  return (
    <Show when={props.userId} fallback={<EmptyValueSymbol class="inline-block" style={{"min-height": "1.45em"}} />}>
      {/* Allow wrapping the client name, but not just after the icon. */}
      <span
        class="inline-block"
        style={{"white-space": "nowrap", "min-height": icon() === true ? "1.45em" : undefined}}
      >
        <Show when={icon()}>
          <Switch>
            {/* Switch is faster than Dynamic, and this component needs to be optinised. */}
            <Match when={props.type === "staff"}>
              <STAFF_ICONS.staff size={icon() === "tiny" ? "1.05em" : "1.3em"} {...ICON_STYLE_PROPS} />
            </Match>
            <Match when={props.type === "clients"}>
              <CLIENT_ICONS.client size={icon() === "tiny" ? "1.05em" : "1.3em"} {...ICON_STYLE_PROPS} />
            </Match>
          </Switch>
        </Show>
        <Show when={name()} fallback={<SmallSpinner />}>
          {(name) => (
            <span style={{"white-space": "initial"}}>
              <Show when={activeFacility() && name().displayName} fallback={t("parenthesised", {text: t("unknown")})}>
                {(displayName) => (
                  <Show when={props.link ?? true} fallback={<>{displayName()}</>}>
                    <LinkWithNewTabLink
                      {...anchorProps}
                      href={`/${activeFacility()?.url}/${allProps.type}/${allProps.userId}`}
                    >
                      {displayName()}
                    </LinkWithNewTabLink>
                  </Show>
                )}
              </Show>
            </span>
          )}
        </Show>
      </span>
    </Show>
  );
};
