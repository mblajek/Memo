import {createMutation} from "@tanstack/solid-query";
import {DeleteButton} from "components/ui/Button";
import {createConfirmation} from "components/ui/confirmation";
import {userIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {toastSuccess} from "components/utils/toast";
import {FacilityClientGroup} from "data-access/memo-api/groups/FacilityClientGroup";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {Api} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";
import {UserLink} from "../facility-users/UserLink";

interface ClientGroupDeleteButtonProps {
  readonly groupId: Api.Id;
  readonly onSuccess?: () => void;
}

export const ClientGroupDeleteButton: VoidComponent<ClientGroupDeleteButtonProps> = (props) => {
  const t = useLangFunc();
  const confirmation = createConfirmation();
  const invalidate = useInvalidator();
  const deleteMutation = createMutation(() => ({
    mutationFn: FacilityClientGroup.deleteClientGroup,
    meta: {isFormSubmit: true},
  }));
  async function deleteClientGroup() {
    await deleteMutation.mutateAsync(props.groupId);
    toastSuccess(t("forms.client_group_delete.success"));
    props.onSuccess?.();
    // Important: Invalidation should happen after calling onEdited which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.clientGroups();
    invalidate.facility.meetings();
  }
  return (
    <DeleteButton
      class="secondary small"
      label={t("actions.client_group.delete")}
      confirm={() =>
        confirmation.confirm({
          title: t("forms.client_group_delete.form_name"),
          body: t("forms.client_group_delete.confirmation_text"),
          confirmText: t("forms.client_group_delete.submit"),
        })
      }
      ctrlAltOverride
      delete={deleteClientGroup}
    />
  );
};

interface ClientGroupDeleteClientButtonProps {
  readonly group: ClientGroupResource;
  readonly clientId: Api.Id;
  readonly onSuccess?: () => void;
}

export const ClientGroupDeleteClientButton: VoidComponent<ClientGroupDeleteClientButtonProps> = (props) => {
  const t = useLangFunc();
  const confirmation = createConfirmation();
  const invalidate = useInvalidator();
  const clientGroupPatchMutation = createMutation(() => ({
    mutationFn: FacilityClientGroup.updateClientGroup,
    meta: {isFormSubmit: true},
  }));
  async function deleteClient() {
    await clientGroupPatchMutation.mutateAsync({
      id: props.group.id,
      clients: props.group.clients.filter(({userId}) => userId !== props.clientId),
    });
    toastSuccess(t("facility_user.client_groups.delete_current_client.success"));
    props.onSuccess?.();
    // Important: Invalidation should happen after calling onEdited which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.clientGroups();
  }
  return (
    <DeleteButton
      class="secondary small"
      icon={<userIcons.Remove class="inlineIcon" />}
      label={t("facility_user.client_groups.delete_current_client.button")}
      confirm={() =>
        confirmation.confirm({
          title: t("facility_user.client_groups.delete_current_client.title"),
          body: () => (
            <div class="flex flex-col gap-1 mb-1">
              <div>{t("facility_user.client_groups.delete_current_client.body")}</div>
              <UserLink userId={props.clientId} type="clients" />
            </div>
          ),
          confirmText: t("facility_user.client_groups.delete_current_client.confirm"),
        })
      }
      ctrlAltOverride
      delete={deleteClient}
    />
  );
};
