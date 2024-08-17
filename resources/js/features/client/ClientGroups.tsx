import {createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {Capitalize} from "components/ui/Capitalize";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {Select} from "components/ui/form/Select";
import {actionIcons, clientGroupIcons} from "components/ui/icons";
import {SmallSpinner} from "components/ui/Spinner";
import {EmptyValueSymbol} from "components/ui/symbols";
import {htmlAttributes, QueryBarrier, useLangFunc} from "components/utils";
import {FacilityClientGroup} from "data-access/memo-api/groups/FacilityClientGroup";
import {ClientResource} from "data-access/memo-api/resources/client.resource";
import {createComputed, createSignal, ParentComponent, Show, VoidComponent} from "solid-js";
import {createClientGroupCreateModal} from "./client_group_create_modal";
import {ClientGroupLabel} from "./ClientGroupLabel";
import {ClientGroupViewEditForm} from "./ClientGroupViewEditForm";

interface Props {
  readonly client: ClientResource;
}

export const ClientGroups: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const clientGroupCreateModal = createClientGroupCreateModal();
  const groupIds = () => props.client.client.groupIds || [];
  const dataQuery = createQuery(() => ({
    ...FacilityClientGroup.clientGroupsQueryOptions(groupIds()),
    enabled: groupIds().length > 0,
  }));

  const CreateGroupButton: ParentComponent<htmlAttributes.button> = (props2) => (
    <Button
      {...htmlAttributes.merge(props2, {class: "secondary small"})}
      onClick={() =>
        clientGroupCreateModal.show({
          initialValues: {
            clients: [{userId: props.client.id, role: ""}],
          },
          currentClientId: props.client.id,
        })
      }
    >
      <actionIcons.Add class="inlineIcon" /> {props2.children}
    </Button>
  );

  const [selectedGroupId, setSelectedGroupId] = createSignal<string | undefined>();
  createComputed(() => {
    if (!groupIds().length) {
      setSelectedGroupId(undefined);
    } else if (!selectedGroupId() || !groupIds().includes(selectedGroupId()!)) {
      setSelectedGroupId(groupIds()[0]);
    }
  });
  return (
    <div class="flex flex-col gap-1">
      <div class="flex justify-between items-center gap-2">
        <div class="flex gap-1 items-center">
          <clientGroupIcons.ClientGroup size="22" />
          <StandaloneFieldLabel>
            <Capitalize
              text={t("facility_user.client_group__interval", {postProcess: "interval", count: groupIds().length})}
            />
          </StandaloneFieldLabel>
        </div>
        <Show when={groupIds().length}>
          <CreateGroupButton title={t("actions.client_group.add_another")} />
        </Show>
      </div>
      <Show
        when={groupIds().length}
        fallback={
          <>
            <EmptyValueSymbol />
            <div>
              <CreateGroupButton>{t("actions.client_group.add")}</CreateGroupButton>
            </div>
          </>
        }
      >
        <QueryBarrier queries={[dataQuery]}>
          <Show when={groupIds().length > 1}>
            <Select
              name="selectedGroupId"
              label=""
              items={groupIds().map((groupId) => ({
                value: groupId,
                label: () => (
                  <Show
                    when={dataQuery.data!.find(({id}) => id === groupId)}
                    fallback={
                      // The group can only be missing as a result of a race.
                      <SmallSpinner />
                    }
                  >
                    {(group) => <ClientGroupLabel group={group()} />}
                  </Show>
                ),
              }))}
              value={selectedGroupId()}
              onValueChange={setSelectedGroupId}
              nullable={false}
              small
            />
          </Show>
          <Show when={dataQuery.data!.find(({id}) => id === selectedGroupId())} fallback={<EmptyValueSymbol />}>
            {(group) => <ClientGroupViewEditForm group={group()} currentClientId={props.client.id} />}
          </Show>
        </QueryBarrier>
      </Show>
    </div>
  );
};
