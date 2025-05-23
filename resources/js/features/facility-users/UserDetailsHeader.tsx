import {useQuery} from "@tanstack/solid-query";
import {EditButton} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {facilityIcons} from "components/ui/icons";
import {title} from "components/ui/title";
import {useLangFunc} from "components/utils/lang";
import {User} from "data-access/memo-api/groups/User";
import {UserResource} from "data-access/memo-api/resources/user.resource";
import {FacilityUserType, getFacilityUserTypeName} from "features/facility-users/user_types";
import {Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {createUserEditModal} from "../user-edit/user_edit_modal";
import {CreatedByInfo} from "./CreatedByInfo";
import {UserLink} from "./UserLink";

type _Directives = typeof title;

interface Props {
  readonly type: FacilityUserType;
  readonly user: UserResource;
}

export const UserDetailsHeader: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const status = useQuery(User.statusQueryOptions);
  const userEditModal = createUserEditModal();
  return (
    <div class="flex justify-between flex-wrap gap-2">
      <div class="flex flex-col gap-0.5">
        <div class="flex items-baseline gap-1.5">
          <h2 class="flex gap-1 items-center font-medium text-xl">
            <UserLink type={props.type} link={false} userId={props.user.id} userName={props.user.name} />
          </h2>
          <div class="text-xs whitespace-nowrap">
            {getFacilityUserTypeName(t, props.type)}
            <Show when={props.user.managedByFacilityId === activeFacilityId()}>
              {" "}
              <span use:title={t("facility_user.managed_by_current_facility")}>
                <facilityIcons.Facility class="inlineIcon" />
              </span>
            </Show>
          </div>
        </div>
        <Show when={props.user.email}>
          <div class="text-sm">
            <Email email={props.user.email || undefined} />{" "}
            <Show when={props.user.hasPassword}>{t("facility_user.is_memo_user_note")}</Show>
          </div>
        </Show>
      </div>
      <div class="ml-auto flex flex-col items-end gap-0.5">
        <CreatedByInfo data={props.user} />
        <Show when={status.data?.permissions.globalAdmin}>
          <EditButton
            onClick={() => userEditModal.show({userId: props.user.id})}
            class="secondary small text-sm"
            label={t("facility_user.edit_as_global_administrator")}
          />
        </Show>
      </div>
    </div>
  );
};
