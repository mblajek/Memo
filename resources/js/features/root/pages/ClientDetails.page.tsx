import {useNavigate, useParams} from "@solidjs/router";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {createHistoryPersistence} from "components/persistence/history_persistence";
import {DeleteButton, EditButton} from "components/ui/Button";
import {Capitalize} from "components/ui/Capitalize";
import {HideableSection} from "components/ui/HideableSection";
import {BigSpinner} from "components/ui/Spinner";
import {DocsModalInfoIcon} from "components/ui/docs_modal";
import {ATTRIBUTES_SCHEMA} from "components/ui/form/AttributeFields";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {TextField} from "components/ui/form/TextField";
import {createAttributesProcessor} from "components/ui/form/attributes_processor";
import {createFormLeaveConfirmation} from "components/ui/form/form_leave_confirmation";
import {EM_DASH} from "components/ui/symbols";
import {Autofocus} from "components/utils/Autofocus";
import {notFoundError} from "components/utils/NotFoundError";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {cx} from "components/utils/classnames";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {ClientResourceForPatch} from "data-access/memo-api/resources/client.resource";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {ClientFields} from "features/client/ClientFields";
import {ClientGroups} from "features/client/ClientGroups";
import {PeopleAutoRelatedToClient} from "features/client/PeopleAutoRelatedToClient";
import {createClientDeleteModal} from "features/client/client_delete_modal";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {useUserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {useUserMeetingsStats} from "features/facility-users/user_meetings_stats";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {
  Match,
  Show,
  Switch,
  VoidComponent,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
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
  const {UserMeetingsTables, ClientNoGroupMeetingsTable, useClientWithNoGroupMeetingsCount} = useUserMeetingsTables();
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
  const [meetingTablesMode, setMeetingTablesMode] = createSignal<"client" | "clientGroup" | "clientNoClientGroup">(
    "client",
  );
  createHistoryPersistence({
    key: "ClientDetails",
    value: () => ({meetingTablesMode: meetingTablesMode()}),
    onLoad: (state) => {
      setMeetingTablesMode(state.meetingTablesMode);
    },
  });
  return (
    <div class="m-2">
      <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
        <Show when={dataQuery.data} fallback={<BigSpinner />}>
          {(user) => {
            const [selectedGroupId, setSelectedGroupId] = createSignal<string>();
            const noGroupMeetingsCount = useClientWithNoGroupMeetingsCount(() =>
              user().client.groupIds?.length ? userId() : undefined,
            );
            onMount(() => {
              createComputed(() => {
                if (
                  !user().client.groupIds?.length ||
                  !selectedGroupId() ||
                  (meetingTablesMode() === "clientNoClientGroup" && !noGroupMeetingsCount())
                ) {
                  setMeetingTablesMode("client");
                }
              });
            });
            const meetingsIntrinsicFilter = (): FilterH => {
              const mode = meetingTablesMode();
              if (mode === "client" || mode === "clientNoClientGroup") {
                return {type: "column", column: "attendant.userId", op: "=", val: userId()};
              } else if (mode === "clientGroup") {
                return {type: "column", column: "attendant.clientGroupId", op: "=", val: selectedGroupId()!};
              } else {
                throw new Error(`Bad mode: ${mode}`);
              }
            };

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
              <>
                <AppTitlePrefix prefix={user().name} />
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
                    <div style={{"min-width": "400px", "flex-basis": "600px"}}>
                      <FelteForm
                        id="client_edit"
                        translationsFormNames={["client_edit", "client", "facility_user"]}
                        translationsModel={["client", "facility_user"]}
                        class="flex flex-col items-stretch gap-4 relative"
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
                              setEditMode(false);
                              form.reset();
                            }
                          }
                          return (
                            <>
                              <Autofocus autofocus={editMode()}>
                                <HideableSection show={editMode() && user().managedByFacilityId === activeFacilityId()}>
                                  {({show}) => <TextField name="name" autofocus disabled={!show()} />}
                                </HideableSection>
                                <ClientFields editMode={editMode()} client={user()} />
                              </Autofocus>
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
                    <div class={hiddenInEditModeClass()} style={{"min-width": "400px", "flex-basis": "800px"}}>
                      <ClientGroups
                        client={user()}
                        onGroupChange={(group) => setSelectedGroupId(group?.id)}
                        allowEditing
                      />
                    </div>
                  </div>
                  <div class={cx("contents", hiddenInEditModeClass())}>
                    <PeopleAutoRelatedToClient clientId={userId()} />
                    <div class="flex flex-col gap-1">
                      <div class="flex gap-2 justify-between">
                        <StandaloneFieldLabel>
                          <Capitalize text={t("models.meeting._name_plural")} />
                        </StandaloneFieldLabel>
                        <Show when={user().client.groupIds?.length}>
                          {(_) => {
                            const items = createMemo(() => [
                              {
                                value: "client",
                                label: () => t("facility_user.meetings_lists.meetings_for.client"),
                              },
                              {
                                value: "clientGroup",
                                label: () => t("facility_user.meetings_lists.meetings_for.client_group"),
                              },
                              ...(noGroupMeetingsCount()
                                ? [
                                    {
                                      value: "clientNoClientGroup",
                                      label: () => (
                                        <span>
                                          {t("facility_user.meetings_lists.meetings_for.no_client_group")}{" "}
                                          <span class="text-grey-text">
                                            {EM_DASH} {noGroupMeetingsCount()}
                                          </span>
                                        </span>
                                      ),
                                    },
                                  ]
                                : []),
                            ]);
                            return (
                              <div class="self-start mt-1 flex gap-1 items-baseline">
                                {t("facility_user.meetings_lists.meetings_for")}
                                <SegmentedControl
                                  name="meeting_tables_mode"
                                  items={items()}
                                  value={meetingTablesMode()}
                                  onValueChange={setMeetingTablesMode}
                                  small
                                />
                                <DocsModalInfoIcon
                                  href="/help/meeting-client-groups"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            );
                          }}
                        </Show>
                      </div>
                      <Switch>
                        <Match when={meetingTablesMode() === "client" || meetingTablesMode() === "clientGroup"}>
                          <UserMeetingsTables
                            staticUserName={user().name}
                            staticUserType="clients"
                            clientGroupMeetings={meetingTablesMode() === "clientGroup"}
                            intrinsicFilter={meetingsIntrinsicFilter()}
                            staticPersistenceKey="clientMeetings"
                            userMeetingsStats={meetingTablesMode() === "clientGroup" ? undefined : meetingsStats()}
                          />
                        </Match>
                        <Match when={meetingTablesMode() === "clientNoClientGroup"}>
                          <ClientNoGroupMeetingsTable
                            staticUserName={user().name}
                            intrinsicFilter={meetingsIntrinsicFilter()}
                            staticPersistenceKey="clientMeetings"
                          />
                        </Match>
                      </Switch>
                    </div>
                  </div>
                </div>
              </>
            );
          }}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
