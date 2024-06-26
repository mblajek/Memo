import {AnchorProps} from "@solidjs/router";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {SmallSpinner} from "components/ui/Spinner";
import {ADMIN_ICONS, CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {EmptyValueSymbol} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {Api} from "data-access/memo-api/types";
import {Show, VoidComponent, createMemo, splitProps} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {useMembersData} from "./members_data";
import {FacilityUserType} from "./user_types";

interface Props extends Partial<AnchorProps> {
  readonly userId: Api.Id | undefined;
  /** The user's type, if known (otherwise it is fetched). */
  readonly type?: FacilityUserType;
  /** The user's display name, if known (otherwise it is fetched). */
  readonly name?: string;
  /** Whether to display the staff/client icon. Default: true. */
  readonly icon?: boolean | "tiny";
  /** Whether to linkify the name. Default: true. */
  readonly link?: boolean;
}

export const UserLink: VoidComponent<Props> = (allProps) => {
  const [props, anchorProps] = splitProps(allProps, ["type", "icon", "link", "userId", "name"]);
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const membersData = useMembersData();
  const memberData = createMemo(() =>
    props.userId
      ? membersData.getById(props.userId) || {
          name: props.name,
          isStaff: props.type === "staff",
          isClient: props.type === "clients",
          hasFacilityAdmin: false,
          hasGlobalAdmin: false,
        }
      : undefined,
  );
  const icon = () => props.icon ?? true;
  const iconStyleProps = () => ({
    class: "inlineIcon shrink-0 text-current",
    style: {"margin-right": "0.1em", "margin-bottom": "0.1em"},
    size: props.icon === "tiny" ? "1.05em" : "1.3em",
  });
  const typeIcon = () => {
    if (icon()) {
      const mData = memberData()!;
      if (mData.isStaff) {
        if (mData.hasFacilityAdmin) {
          return <STAFF_ICONS.staffAndFacilityAdmin {...iconStyleProps()} />;
        } else {
          return <STAFF_ICONS.staff {...iconStyleProps()} />;
        }
      } else if (mData.isClient) {
        return <CLIENT_ICONS.client {...iconStyleProps()} />;
      } else if (mData.hasFacilityAdmin) {
        return <ADMIN_ICONS.admin {...iconStyleProps()} />;
      }
    }
  };
  const linkHref = () => {
    if (props.link ?? true) {
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
      <span class="inline-block whitespace-nowrap" style={{"min-height": icon() === true ? "1.45em" : undefined}}>
        {typeIcon()}
        <Show when={!membersData.isPending()} fallback={<SmallSpinner />}>
          <span style={{"white-space": "initial"}}>
            <Show when={activeFacility() && memberData()?.name} fallback={t("parenthesised", {text: t("unknown")})}>
              {(name) => (
                <Show when={linkHref()} fallback={<>{name()}</>}>
                  {(href) => (
                    <LinkWithNewTabLink {...anchorProps} href={href()}>
                      {name()}
                    </LinkWithNewTabLink>
                  )}
                </Show>
              )}
            </Show>
          </span>
        </Show>
      </span>
    </Show>
  );
};
