import {A, AnchorProps} from "@solidjs/router";
import {SmallSpinner} from "components/ui/Spinner";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {Api} from "data-access/memo-api/types";
import {FacilityUserType, useUserDisplayNames} from "data-access/memo-api/user_display_names";
import {Show, VoidComponent, splitProps} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

interface Props extends Partial<AnchorProps> {
  readonly type: FacilityUserType;
  readonly userId: Api.Id;
}

export const UserLink: VoidComponent<Props> = (allProps) => {
  const [props, anchorProps] = splitProps(allProps, ["type", "userId"]);
  const activeFacility = useActiveFacility();
  const userDisplayNames = useUserDisplayNames();
  const name = () => userDisplayNames.get(props.type, props.userId);
  return (
    <Show when={props.userId} fallback={EMPTY_VALUE_SYMBOL}>
      <Show when={name() && activeFacility()} fallback={<SmallSpinner />}>
        <A {...anchorProps} href={`/${activeFacility()!.url}/${props.type}/${props.userId}`}>
          {name()}
        </A>
      </Show>
    </Show>
  );
};
