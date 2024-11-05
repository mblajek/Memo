import {EditButton} from "components/ui/Button";
import {MutationTrackingLoadingPane} from "components/ui/LoadingPane";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {Show, VoidComponent} from "solid-js";
import {ClientGroupDeleteButton, ClientGroupDeleteClientButton} from "./client_group_delete";
import {createClientGroupEditModal} from "./client_group_edit_modal";
import {ClientGroupBox} from "./ClientGroupBox";
import {ClientGroupView} from "./ClientGroupView";

export interface ClientGroupViewEditFormProps {
  readonly group: ClientGroupResource;
  readonly currentClientId?: string;
  /** Whether the component allows editing groups (as opposed to just viewing). Default: false */
  readonly allowEditing?: boolean;
  /** Whether the component allows deleting groups. Default: same as allowEditing */
  readonly allowDeleting?: boolean;
}

export const ClientGroupViewEditForm: VoidComponent<ClientGroupViewEditFormProps> = (props) => {
  const clientGroupEditModal = createClientGroupEditModal();
  return (
    <ClientGroupBox class="flex flex-col gap-3">
      <div class="relative flex flex-col">
        <ClientGroupView group={props.group} currentClientId={props.currentClientId} />
        <MutationTrackingLoadingPane />
      </div>
      <div class="flex gap-1 justify-between">
        <Show when={props.allowDeleting ?? props.allowEditing ?? true} fallback={<div />}>
          <ClientGroupDeleteButton groupId={props.group.id} />
        </Show>
        <Show when={props.allowEditing ?? true} fallback={<div />}>
          <div class="flex gap-1">
            <Show when={props.group.clients.length > 1 && props.currentClientId}>
              {(currentClientId) => <ClientGroupDeleteClientButton group={props.group} clientId={currentClientId()} />}
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
        </Show>
      </div>
    </ClientGroupBox>
  );
};
