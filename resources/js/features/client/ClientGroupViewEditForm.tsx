import {EditButton} from "components/ui/Button";
import {LoadingPane} from "components/ui/LoadingPane";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {Show, VoidComponent} from "solid-js";
import {CreatedByInfo} from "../facility-users/CreatedByInfo";
import {ClientGroupDeleteButton, ClientGroupDeleteClientButton, useClientGroupDelete} from "./client_group_delete";
import {createClientGroupEditModal} from "./client_group_edit_modal";
import {ClientGroupBox} from "./ClientGroupBox";
import {ClientGroupView} from "./ClientGroupView";

interface Props {
  readonly group: ClientGroupResource;
  readonly currentClientId?: string;
}

export const ClientGroupViewEditForm: VoidComponent<Props> = (props) => {
  const clientGroupEditModal = createClientGroupEditModal();
  const clientGroupDelete = useClientGroupDelete();
  return (
    <ClientGroupBox class="flex flex-col gap-3">
      <div class="relative flex flex-col">
        <div class="flex gap-4 justify-between">
          <ClientGroupView group={props.group} currentClientId={props.currentClientId} />
          <CreatedByInfo data={props.group} />
        </div>
        <LoadingPane isLoading={clientGroupDelete.isPending()} />
      </div>
      <div class="flex gap-1 justify-between">
        <ClientGroupDeleteButton groupId={props.group.id} />
        <div class="flex gap-1">
          <Show when={props.group.clients.length > 1 && props.currentClientId}>
            {(currentClientId) => (
              <ClientGroupDeleteClientButton groupId={props.group.id} clientId={currentClientId()} />
            )}
          </Show>
          <EditButton
            class="secondary small"
            onClick={() =>
              clientGroupEditModal.show({
                staticGroupId: props.group.id,
                currentClientId: props.currentClientId,
              })
            }
          />
        </div>
      </div>
    </ClientGroupBox>
  );
};
