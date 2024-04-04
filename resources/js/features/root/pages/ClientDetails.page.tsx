import {useParams} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {EditButton} from "components/ui/Button";
import {BigSpinner} from "components/ui/Spinner";
import {ATTRIBUTES_SCHEMA, AttributesType} from "components/ui/form/AttributeFields";
import {createAttributesProcessor} from "components/ui/form/attributes_processor";
import {createFormLeaveConfirmation} from "components/ui/form/form_leave_confirmation";
import {QueryBarrier, cx, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {toastSuccess} from "components/utils/toast";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {ClientResourceForPatch} from "data-access/memo-api/resources/client.resource";
import {ClientFields} from "features/client/ClientFields";
import {PeopleAutoRelatedToClient} from "features/facility-users/PeopleAutoRelatedToClient";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {UserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {useUserMeetingsStats} from "features/facility-users/user_meetings_stats";
import {Match, Show, Switch, VoidComponent, createSignal} from "solid-js";
import {z} from "zod";

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  const invalidate = useInvalidator();
  const confirmation = createFormLeaveConfirmation();
  const clientAttributesProcessor = createAttributesProcessor("client");
  const userId = () => params.userId!;
  const dataQuery = createQuery(() => FacilityClient.clientQueryOptions(userId()));
  const meetingsStats = useUserMeetingsStats("clients", userId);
  const [editMode, setEditMode] = createSignal(false);
  const clientMutation = createMutation(() => ({
    mutationFn: FacilityClient.updateClient,
    meta: {isFormSubmit: true},
  }));

  async function updateAttributes(values: {client: AttributesType}) {
    const patch: ClientResourceForPatch = {id: userId(), client: clientAttributesProcessor.extract(values.client)};
    await clientMutation.mutateAsync(patch);
    return () => {
      toastSuccess(t("forms.client_edit.success"));
      setEditMode(false);
      invalidate.users();
    };
  }

  return (
    <div class="m-2">
      <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
        <Show when={dataQuery.data} fallback={<BigSpinner />}>
          {(user) => (
            <div class="flex flex-col items-stretch gap-4">
              <UserDetailsHeader
                type="clients"
                user={{
                  ...user(),
                  createdAt: user().client.createdAt,
                  createdBy: user().client.createdBy,
                  updatedAt: user().client.updatedAt,
                  updatedBy: user().client.updatedBy,
                }}
              />
              <FelteForm
                id="client_edit"
                translationsFormNames={["client_edit", "client", "facility_user"]}
                class="flex flex-col items-stretch gap-3 relative"
                style={{width: "min(600px, 100%)"}}
                schema={z.object({client: ATTRIBUTES_SCHEMA})}
                initialValues={user()}
                onSubmit={updateAttributes}
              >
                {(form) => {
                  async function formCancel() {
                    if (!form.isDirty() || (await confirmation.confirm())) {
                      form.reset();
                      setEditMode(false);
                    }
                  }
                  return (
                    <>
                      <ClientFields editMode={editMode()} />
                      <Switch>
                        <Match when={editMode()}>
                          <FelteSubmit cancel={formCancel} />
                        </Match>
                        <Match when={!editMode()}>
                          <div class="flex justify-end">
                            <EditButton class="secondary small" onClick={[setEditMode, true]} />
                          </div>
                        </Match>
                      </Switch>
                    </>
                  );
                }}
              </FelteForm>
              <div class={cx(editMode() ? "hidden" : undefined)}>
                <PeopleAutoRelatedToClient clientId={userId()} />
                <UserMeetingsTables
                  userName={user().name}
                  userType="clients"
                  intrinsicFilter={{
                    type: "column",
                    column: "attendant.userId",
                    op: "=",
                    val: userId(),
                  }}
                  staticPersistenceKey="clientMeetings"
                  userMeetingsStats={meetingsStats}
                />
              </div>
            </div>
          )}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
