import {createQuery} from "@tanstack/solid-query";
import {Button} from "components/ui/Button";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {QueryBarrier, useLangFunc} from "components/utils";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {createComputed, createSignal, Match, Show, Switch, VoidComponent} from "solid-js";
import {useAutoRelatedClients} from "../facility-users/auto_releated_clients";
import {ClientGroups} from "./ClientGroups";
import {createClientGroupCreateModal} from "./client_group_create_modal";
import {createClientGroupEditModal} from "./client_group_edit_modal";
import {clientGroupInitialValuesForCreate} from "./ClientGroupForm";

export interface AddToClientGroupFormProps {
  readonly clientId: string;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const AddToClientGroupForm: VoidComponent<AddToClientGroupFormProps> = (props) => {
  const t = useLangFunc();
  const clientGroupCreateModal = createClientGroupCreateModal();
  const clientGroupEditModal = createClientGroupEditModal();
  const modelQuerySpecs = useModelQuerySpecs();
  const autoRelatedClients = useAutoRelatedClients();
  // eslint-disable-next-line solid/reactivity
  const priorityQueryParams = autoRelatedClients.selectParamsExtension(() => [props.clientId]);
  const [groupMember, setGroupMember] = createSignal<string | undefined>();
  const validGroupMember = () => (groupMember() === props.clientId ? undefined : groupMember());
  const clientDataQuery = createQuery(() => ({
    ...FacilityClient.clientQueryOptions(validGroupMember() || ""),
    enabled: !!validGroupMember(),
  }));
  const [group, setGroup] = createSignal<ClientGroupResource>();
  const [isGroupFetching, setIsGroupFetching] = createSignal(false);
  const isFetching = () => clientDataQuery.isFetching || isGroupFetching();
  const validGroup = () =>
    !isFetching() && group() && !group()!.clients.some(({userId}) => userId === props.clientId) ? group() : undefined;
  createComputed(() => {
    if (!validGroupMember()) {
      setGroup(undefined);
      setIsGroupFetching(false);
    }
  });
  return (
    <div class="flex flex-col gap-2">
      <div class="flex flex-col">
        <StandaloneFieldLabel>{t("forms.add_to_client_group.field_names.group_member")}</StandaloneFieldLabel>
        <TQuerySelect
          name="group_member"
          label=""
          value={groupMember()}
          onValueChange={setGroupMember}
          {...modelQuerySpecs.userClient()}
          {...priorityQueryParams()}
          nullable={false}
        />
        <Show when={groupMember() === props.clientId}>
          <div class="font-semibold text-red-600">{t("forms.add_to_client_group.text.group_member_is_same")}</div>
        </Show>
      </div>
      <Show when={validGroupMember()}>
        <QueryBarrier queries={[clientDataQuery]}>
          <ClientGroups
            client={clientDataQuery.data!}
            onGroupChange={(group, isGroupFetching) => {
              setGroup(group);
              setIsGroupFetching(isGroupFetching);
            }}
            noGroupsText={() => t("forms.add_to_client_group.text.no_groups")}
          />
          <Show when={group() && !isFetching() && !validGroup()}>
            <div class="font-semibold text-red-600">{t("forms.add_to_client_group.text.already_in_group")}</div>
          </Show>
        </QueryBarrier>
      </Show>
      <div class="grid auto-cols-fr grid-flow-col gap-1">
        <Button class="secondary" onClick={props.onCancel}>
          {t("actions.cancel")}
        </Button>
        <Switch>
          <Match when={validGroup()}>
            {(validGroup) => (
              <Button
                class="primary"
                onClick={() =>
                  clientGroupEditModal.show({
                    staticGroupId: validGroup().id,
                    currentClientId: props.clientId,
                    initialValuesEditFunc: (initialValues) => ({
                      ...initialValues,
                      clients: [...initialValues.clients, {userId: props.clientId, role: ""}],
                    }),
                    onSuccess: props.onSuccess,
                  })
                }
              >
                {t("forms.add_to_client_group.submit.add_to_group")}
              </Button>
            )}
          </Match>
          <Match when={validGroupMember() && !isFetching() && !group()}>
            <Button
              class="primary"
              onClick={() =>
                clientGroupCreateModal.show({
                  initialValues: clientGroupInitialValuesForCreate([validGroupMember()!, props.clientId]),
                  onSuccess: props.onSuccess,
                })
              }
            >
              {t("forms.add_to_client_group.submit.create_group")}
            </Button>
          </Match>
          <Match when="fallback">
            <Button class="primary" title={t("forms.add_to_client_group.text.select_group_hint")} disabled>
              {t("forms.add_to_client_group.submit.add_to_group")}
            </Button>
          </Match>
        </Switch>
      </div>
    </div>
  );
};

// For lazy loading
export default AddToClientGroupForm;
