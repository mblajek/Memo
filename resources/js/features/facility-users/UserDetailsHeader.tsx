import {createQuery} from "@tanstack/solid-query";
import {EditButton} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {useLangFunc} from "components/utils";
import {User} from "data-access/memo-api/groups";
import {UserResource} from "data-access/memo-api/resources/user.resource";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {Show, VoidComponent} from "solid-js";
import {createUserEditModal} from "../user-edit/user_edit_modal";
import {CreatedByInfo} from "./CreatedByInfo";
import {UserLink} from "./UserLink";

interface Props {
  readonly type: FacilityUserType;
  readonly user: UserResource;
}

export const UserDetailsHeader: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const status = createQuery(User.statusQueryOptions);
  const userEditModal = createUserEditModal();
  const typeText = () =>
    t(
      props.type === "staff"
        ? "models.staff._name"
        : props.type === "clients"
          ? "models.client._name"
          : (props.type satisfies never),
    );
  return (
    <div class="flex justify-between flex-wrap gap-2">
      <div class="flex flex-col gap-0.5">
        <div class="flex items-baseline gap-1.5">
          <h2 class="flex gap-1 items-center font-medium text-xl">
            <UserLink type={props.type} link={false} userId={props.user.id} name={props.user.name} />
          </h2>
          <div class="text-xs">{t("parenthesised", {text: typeText()})}</div>
        </div>
        <Show when={props.user.email}>
          <div class="text-sm">
            <Email email={props.user.email || undefined} />{" "}
            <Show when={props.user.hasPassword}>{t("facility_user.is_memo_user_note")}</Show>
          </div>
        </Show>
      </div>
      <div class="flex flex-col items-end gap-0.5">
        <CreatedByInfo user={props.user} />
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
