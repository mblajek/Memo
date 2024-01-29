import {A, AnchorProps, useLocation} from "@solidjs/router";
import {SmallSpinner} from "components/ui/Spinner";
import {CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {Api} from "data-access/memo-api/types";
import {FacilityUserType, useUserDisplayNames} from "data-access/memo-api/user_display_names";
import {FiExternalLink} from "solid-icons/fi";
import {Show, VoidComponent, mergeProps, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";
import {useActiveFacility} from "state/activeFacilityId.state";

interface Props extends Partial<AnchorProps> {
  readonly type: FacilityUserType;
  /** Whether to display the staff/client icon. Default: true. */
  readonly icon?: boolean;
  /** Whether to linkify the name. Default: true. */
  readonly link?: boolean;
  readonly userId: Api.Id;
  /** The user's display name, if known (otherwise it is fetched). */
  readonly name?: string;
}

const ICONS = {
  staff: STAFF_ICONS.staff,
  clients: CLIENT_ICONS.client,
};

export const UserLink: VoidComponent<Props> = (allProps) => {
  const location = useLocation();
  const href = () => `/${activeFacility()!.url}/${allProps.type}/${allProps.userId}`;
  const isOnThisUserPage = () => location.pathname === href();
  /** Whether to include a link opening in the same window. Don't include it if we're already on that user's page. */
  const includeNormalLink = () => props.link && !isOnThisUserPage();
  const defProps = mergeProps({icon: true, link: true}, allProps);
  const [props, anchorProps] = splitProps(defProps, ["type", "icon", "link", "userId", "name"]);
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const userDisplayNames = useUserDisplayNames();
  const name = () => (props.name ? {displayName: props.name} : userDisplayNames.get(props.type, props.userId));
  return (
    <Show when={props.userId} fallback={EMPTY_VALUE_SYMBOL}>
      {/* Allow wrapping the client name, but not just after the icon. */}
      <span class="inline-block" style={{"white-space": "nowrap"}}>
        <Show when={props.icon}>
          <Dynamic
            component={ICONS[props.type]}
            size="1.3em"
            class="inline shrink-0 text-current"
            style={{"margin-right": "0.1em", "margin-bottom": "0.1em"}}
          />
        </Show>
        <Show when={name()} fallback={<SmallSpinner />}>
          {(name) => (
            <span style={{"white-space": "initial"}}>
              <Show when={activeFacility() && name().displayName} fallback={t("parenthesised", {text: t("unknown")})}>
                {(displayName) => (
                  <Show when={props.link} fallback={<>{displayName()}</>}>
                    <span>
                      <Show when={includeNormalLink()} fallback={displayName()}>
                        <A {...anchorProps} href={href()}>
                          {displayName()}
                        </A>
                      </Show>{" "}
                      <A {...anchorProps} href={href()} target="_blank" title={t("open_in_new_tab")}>
                        <FiExternalLink class="inlineIcon strokeIcon text-current" />
                      </A>
                    </span>
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
