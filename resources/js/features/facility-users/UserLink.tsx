import {AnchorProps} from "@solidjs/router";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {SmallSpinner} from "components/ui/Spinner";
import {adminIcons, clientIcons, staffIcons} from "components/ui/icons";
import {EmptyValueSymbol} from "components/ui/symbols";
import {cx, useLangFunc} from "components/utils";
import {Api} from "data-access/memo-api/types";
import {Match, Show, Switch, VoidComponent, createMemo, splitProps} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {useMembersData} from "./members_data";
import {FacilityUserType} from "./user_types";

interface Props extends Partial<AnchorProps> {
  /** The user id, or `"any"` to show the icon without text. */
  readonly userId: Api.Id | undefined;
  /** The user's type, if known (otherwise it is fetched). */
  readonly type?: FacilityUserType;
  /** The user's display name, if known (otherwise it is fetched). */
  readonly name?: string;
  /** Whether to display the staff/client icon. Default: true. */
  readonly icon?: boolean | "tiny";
  /** Whether to show the name as text or link (if false, just the icon is shown). Default: true. */
  readonly showName?: boolean;
  /** Whether to linkify the name. Default: true. */
  readonly link?: boolean;
  /** Whether to show the link for opening in a new tab. Default: same as link. */
  readonly newTabLink?: boolean;
}

export const UserLink: VoidComponent<Props> = (allProps) => {
  const [props, anchorProps] = splitProps(allProps, [
    "type",
    "icon",
    "showName",
    "link",
    "newTabLink",
    "userId",
    "name",
  ]);
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const membersData = useMembersData();
  const memberData = createMemo(() =>
    props.userId
      ? membersData.getById(props.userId) || {
          name: props.name,
          isStaff: props.type === "staff",
          // Initially assume staff is active.
          isActiveStaff: props.type === "staff",
          isClient: props.type === "clients",
          hasFacilityAdmin: false,
          hasGlobalAdmin: false,
        }
      : undefined,
  );
  const isInactive = () => memberData()?.isStaff && !memberData()?.isActiveStaff;
  const icon = () => props.icon ?? true;
  const iconStyleProps = () => ({
    class: cx("inlineIcon", isInactive() ? "text-black dimmed" : undefined),
    style: {"margin-right": "0.1em", "margin-bottom": "0.1em"},
    size: props.icon === "tiny" ? "1.05em" : "1.3em",
  });
  const typeIcon = () => {
    if (icon()) {
      const mData = memberData()!;
      if (mData.isStaff) {
        if (mData.hasFacilityAdmin) {
          return <staffIcons.StaffAndFacilityAdmin {...iconStyleProps()} />;
        } else {
          return <staffIcons.Staff {...iconStyleProps()} />;
        }
      } else if (mData.isClient) {
        return <clientIcons.Client {...iconStyleProps()} />;
      } else if (mData.hasFacilityAdmin) {
        return <adminIcons.Admin {...iconStyleProps()} />;
      }
    }
  };
  const linkHref = () => {
    if (props.newTabLink || (props.link ?? true)) {
      const mData = memberData()!;
      if (mData.isStaff) {
        return `/${activeFacility()?.url}/staff/${allProps.userId}`;
      } else if (mData.isClient) {
        return `/${activeFacility()?.url}/clients/${allProps.userId}`;
      }
    }
  };
  return (
    <Show when={props.userId} fallback={<EmptyValueSymbol class="inline-block" style={{"min-height": "1.45em"}} />}>
      {/* Allow wrapping the name, but not just after the icon. */}
      <span
        class="inline-block whitespace-nowrap text-black"
        style={{"min-height": icon() === true ? "1.45em" : undefined}}
      >
        {typeIcon()}
        <Show when={props.showName ?? true}>
          <span class={isInactive() ? "text-grey-text" : undefined} style={{"white-space": "initial"}}>
            <Switch>
              <Match when={activeFacility() && memberData()?.name}>
                {(name) => (
                  <Show when={linkHref()} fallback={<>{name()}</>}>
                    {(href) => (
                      <LinkWithNewTabLink
                        {...anchorProps}
                        href={href()}
                        sameTabLink={props.link}
                        newTabLink={props.newTabLink}
                      >
                        {name()}
                      </LinkWithNewTabLink>
                    )}
                  </Show>
                )}
              </Match>
              <Match when={membersData.isPending()}>
                <SmallSpinner />
              </Match>
              <Match when="fallback">
                <>{t("parenthesised", {text: t("unknown")})}</>
              </Match>
            </Switch>
          </span>
        </Show>
      </span>
    </Show>
  );
};
