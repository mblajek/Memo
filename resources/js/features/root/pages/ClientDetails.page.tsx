import {useNavigate, useParams} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {DeleteButton, EditButton} from "components/ui/Button";
import {HideableSection} from "components/ui/HideableSection";
import {BigSpinner} from "components/ui/Spinner";
import {ATTRIBUTES_SCHEMA} from "components/ui/form/AttributeFields";
import {TextField} from "components/ui/form/TextField";
import {createAttributesProcessor} from "components/ui/form/attributes_processor";
import {createFormLeaveConfirmation} from "components/ui/form/form_leave_confirmation";
import {QueryBarrier, cx, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {toastSuccess} from "components/utils/toast";
import {User} from "data-access/memo-api/groups";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {ClientResourceForPatch} from "data-access/memo-api/resources/client.resource";
import {ClientFields} from "features/client/ClientFields";
import {ClientGroups} from "features/client/ClientGroups";
import {PeopleAutoRelatedToClient} from "features/client/PeopleAutoRelatedToClient";
import {createClientDeleteModal} from "features/client/client_delete_modal";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {UserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {useUserMeetingsStats} from "features/facility-users/user_meetings_stats";
import {Match, Show, Switch, VoidComponent, createEffect, createSignal} from "solid-js";
import {activeFacilityId, useActiveFacility} from "state/activeFacilityId.state";
import {z} from "zod";

const getSchema = () =>
  z.object({
    name: z.string().optional(),
    client: ATTRIBUTES_SCHEMA,
  });

type FormType = z.infer<ReturnType<typeof getSchema>>;

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  const status = createQuery(User.statusQueryOptions);
  const navigate = useNavigate();
  const invalidate = useInvalidator();
  const clientDeleteModal = createClientDeleteModal();
  const formLeaveConfirmation = createFormLeaveConfirmation();
  const activeFacility = useActiveFacility();
  const clientAttributesProcessor = createAttributesProcessor("client");
  const userId = () => params.userId!;
  const dataQuery = createQuery(() => FacilityClient.clientQueryOptions(userId()));
  const meetingsStats = useUserMeetingsStats("clients", userId);
  /** Whether we can be sure this client has meetings. If false, there might still be some. */
  const hasMeetings = () => !!meetingsStats()?.completedMeetingsCount || !!meetingsStats()?.plannedMeetingsCount;
  const [editMode, setEditMode] = createSignal(false);
  const updateClientMutation = createMutation(() => ({
    mutationFn: FacilityClient.updateClient,
    meta: {isFormSubmit: true},
  }));
  const hiddenInEditModeClass = () => (editMode() ? "hidden" : undefined);
  return (
    <div class="m-2">
      <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
        <Show when={dataQuery.data} fallback={<BigSpinner />}>
          {(user) => {
            async function updateClient(values: FormType) {
              const patch: ClientResourceForPatch = {
                id: userId(),
                name: user().managedByFacilityId === activeFacilityId() ? values.name : undefined,
                client: clientAttributesProcessor.extract(values.client),
              };
              await updateClientMutation.mutateAsync(patch);
              return () => {
                toastSuccess(t("forms.client_edit.success"));
                setEditMode(false);
                invalidate.users();
              };
            }

            return (
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
                <div class="flex flex-wrap justify-between gap-y-4 gap-x-8">
                  <div class="flex flex-col items-stretch gap-4 relative">
                    <FelteForm
                      id="client_edit"
                      translationsFormNames={["client_edit", "client", "facility_user"]}
                      translationsModel={["client", "facility_user"]}
                      class="flex flex-col items-stretch gap-4 relative"
                      style={{width: "min(600px, 100%)"}}
                      schema={getSchema()}
                      initialValues={user()}
                      onSubmit={updateClient}
                    >
                      {(form) => {
                        createEffect(() => {
                          form.setInitialValues(user() as unknown as FormType);
                          setTimeout(() => {
                            if (!editMode() && !dataQuery.isPending) {
                              form.reset();
                            }
                          });
                        });
                        async function formCancel() {
                          if (!form.isDirty() || (await formLeaveConfirmation.confirm())) {
                            form.reset();
                            setEditMode(false);
                          }
                        }
                        return (
                          <>
                            <HideableSection show={editMode() && user().managedByFacilityId === activeFacilityId()}>
                              {(show) => <TextField name="name" disabled={!show()} />}
                            </HideableSection>
                            <ClientFields editMode={editMode()} />
                            <Switch>
                              <Match when={editMode()}>
                                <FelteSubmit cancel={formCancel} />
                              </Match>
                              <Match when={!editMode()}>
                                <div class="flex justify-between gap-1">
                                  <Show when={status.data?.permissions.facilityAdmin}>
                                    <DeleteButton
                                      class="secondary small"
                                      label={t("forms.client_delete.activate_button")}
                                      delete={() =>
                                        clientDeleteModal.show({
                                          id: userId(),
                                          initialRequiresDuplicateOf: hasMeetings(),
                                          onSuccess: ({duplicateOf}) =>
                                            navigate(
                                              `/${activeFacility()?.url}/clients${duplicateOf ? `/${duplicateOf}` : ""}`,
                                            ),
                                        })
                                      }
                                    />
                                  </Show>
                                  <EditButton class="secondary small" onClick={[setEditMode, true]} />
                                </div>
                              </Match>
                            </Switch>
                          </>
                        );
                      }}
                    </FelteForm>
                  </div>
                  <div class={hiddenInEditModeClass()} style={{width: "min(800px, 100%)"}}>
                    <ClientGroups client={user()} allowEditing />
                  </div>
                </div>
                <div class={cx("contents", hiddenInEditModeClass())}>
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
            );
          }}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
