import {Obj} from "@felte/core";
import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {Capitalize, capitalizeString} from "components/ui/Capitalize";
import {HideableSection} from "components/ui/HideableSection";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {PlaceholderField} from "components/ui/form/PlaceholderField";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {Select} from "components/ui/form/Select";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {actionIcons, clientGroupIcons} from "components/ui/icons";
import {EMPTY_VALUE_SYMBOL_STRING, EmptyValueSymbol} from "components/ui/symbols";
import {title} from "components/ui/title";
import {NON_NULLABLE, cx, useLangFunc} from "components/utils";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {
  MeetingClientResource,
  MeetingResource,
  MeetingResourceForCreate,
  MeetingResourceForPatch,
  MeetingStaffResource,
} from "data-access/memo-api/resources/meeting.resource";
import {FilterReductor} from "data-access/memo-api/tquery/filter_utils";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {
  Accessor,
  Index,
  Match,
  Show,
  Switch,
  VoidComponent,
  batch,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  on,
} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";
import {SharedClientGroupLabel} from "../client/SharedClientGroupLabel";
import {useClientGroupFetcher} from "../client/client_group_fetcher";
import {UserLink} from "../facility-users/UserLink";
import {useAutoRelatedClients} from "../facility-users/auto_releated_clients";
import {MeetingFormType} from "./MeetingForm";
import {MeetingAttendanceStatus, MeetingAttendanceStatusInfoIcon} from "./attendance_status_info";
import {useMeetingConflictsFinder} from "./meeting_conflicts_finder";
import {getMeetingTimeFullData} from "./meeting_time_controller";
import {ClientGroupBox} from "../client/ClientGroupBox";

type _Directives = typeof title;

export const getAttendantsSchemaPart = () =>
  z.object({
    staff: getAttendantsSchema(),
    clients: getAttendantsSchema(),
  });

const getAttendantsSchema = () =>
  z.array(
    z.object({
      userId: z.string(),
      clientGroupId: z.string(),
      attendanceStatusDictId: z.string(),
    }),
  );

interface Props {
  readonly name: "staff" | "clients";
  /** The id of this meeting, if it already exists. */
  readonly meetingId?: string;
  /** Whether to show the attendance status label. Default: true. */
  readonly showAttendanceStatusLabel?: boolean;
  readonly viewMode: boolean;
  /** Whether to show conflicts. Supported only for staff. Default: true. */
  readonly showConflicts?: boolean;
}

interface FormAttendantsData extends Obj {
  readonly statusDictId?: string;
  readonly staff: readonly FormAttendantData[];
  readonly clients: readonly FormAttendantData[];
}

type ClientsGroupsMode = "none" | "shared" | "separate";

type FormAttendantData = Pick<
  MeetingStaffResource & MeetingClientResource,
  "userId" | "clientGroupId" | "attendanceStatusDictId"
>;

export const MeetingAttendantsFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const {createAttendant} = useAttendantsCreator();
  const modelQuerySpecs = useModelQuerySpecs();
  const autoRelatedClients = useAutoRelatedClients();
  const clientGroupFetcher = useClientGroupFetcher();
  const {form, translations, isFormDisabled} = useFormContext<MeetingFormType>();
  const meetingStatusId = () => form.data("statusDictId");
  const meetingStatus = () => (meetingStatusId() ? dictionaries()?.getPositionById(meetingStatusId()!) : undefined);
  const showConflicts = createMemo(() => props.name === "staff" && (props.showConflicts ?? true));
  const conflictsFinder = createMemo(
    on(showConflicts, (showConflicts) =>
      showConflicts
        ? useMeetingConflictsFinder(() => ({
            id: props.meetingId,
            ...getMeetingTimeFullData(form.data()),
          }))
        : undefined,
    ),
  );

  createEffect(
    on(
      [
        () => props.viewMode,
        () => form.data(props.name),
        form.data, // to nudge the form and improve reactivity
      ],
      ([viewMode, attendants], _prevInput, prevAttendantIds: readonly string[] | undefined) => {
        // When in edit mode, add an empty row at the end in the following situations:
        if (
          !viewMode &&
          // there are no rows, or...
          (!attendants.length ||
            // ...the last row was empty and it got filled in, but it was not the only row
            // (in case of one row, the component is in "one row mode" and doesn't add rows automatically).
            (prevAttendantIds &&
              attendants.length > 1 &&
              attendants.length === prevAttendantIds.length &&
              !prevAttendantIds.at(-1) &&
              attendants.at(-1)!.userId))
        )
          form.addField(props.name, createAttendant());
        return attendants.map(({userId}) => userId);
      },
    ),
  );

  const selectedClients = createMemo(
    on(
      form.data, // to nudge the form and improve reactivity
      (formData) => (props.name === "clients" ? formData.clients.map(({userId}) => userId).filter(Boolean) : []),
    ),
  );
  const {dataQuery: clientsWithGroupsDataQuery} = createTQuery({
    prefixQueryKey: FacilityClient.keys.client(),
    entityURL: `facility/${activeFacilityId()}/user/client`,
    requestCreator: staticRequestCreator((schema) => {
      const reductor = new FilterReductor(schema);
      return {
        columns: [
          {type: "column", column: "id"},
          {type: "column", column: "client.groups.*.id"},
        ],
        filter: reductor.reduce({type: "column", column: "id", op: "in", val: selectedClients()}),
        sort: [],
        paging: {size: 1000},
      };
    }),
  });
  const groupsByClientId = createMemo((): ReadonlyMap<string, readonly string[]> => {
    const map = new Map<string, readonly string[]>();
    for (const client of clientsWithGroupsDataQuery.data?.data ?? []) {
      map.set(client.id as string, client["client.groups.*.id"] as readonly string[]);
    }
    return map;
  });
  /** All groups of all the selected clients. */
  const allGroups = createMemo((): ReadonlyMap<string, Accessor<readonly string[] | undefined>> => {
    if (props.name === "clients") {
      const allGroupIds = new Set<string>();
      for (const groups of groupsByClientId().values()) {
        for (const group of groups) {
          allGroupIds.add(group);
        }
      }
      for (const {clientGroupId} of form.data("clients")) {
        if (clientGroupId) {
          allGroupIds.add(clientGroupId);
        }
      }
      const map = new Map<string, Accessor<readonly string[] | undefined>>();
      for (const groupId of allGroupIds) {
        const group = clientGroupFetcher.fetch(groupId);
        map.set(groupId, () => group()?.clients.map(({userId}) => userId));
      }
      return map;
    } else {
      return new Map();
    }
  });
  /** Determines if, according to the loaded data, the user is in the given group. False negatives are possible. */
  function isClientInGroup(clientId: string, groupId: string) {
    return (
      clientId &&
      (groupsByClientId().get(clientId)?.includes(groupId) || allGroups().get(groupId)?.()?.includes(clientId))
    );
  }
  /** The groups that all the selected clients belong to. */
  const sharedGroups = createMemo((): readonly string[] => [
    ...allGroups()
      .keys()
      .filter((groupId) => selectedClients().every((clientId) => isClientInGroup(clientId, groupId))),
  ]);

  const [clientsGroupsMode, setClientsGroupsMode] = createSignal<ClientsGroupsMode>();
  const [sharedClientsGroupId, setSharedClientsGroupId] = createSignal<string>("");

  createComputed(
    on(
      () => props.name === "clients",
      (isClients) => {
        if (isClients) {
          function getSelectedAttendanceGroups(formData: FormAttendantsData) {
            const res: (string | undefined)[] = [];
            for (const {userId, clientGroupId} of formData.clients) {
              if (userId && !res.includes(clientGroupId || undefined)) {
                res.push(clientGroupId || undefined);
              }
            }
            return res;
          }

          function setMode(mode: ClientsGroupsMode, sharedGroup = "") {
            batch(() => {
              setClientsGroupsMode(mode);
              setSharedClientsGroupId(clientsGroupsMode() === "shared" ? sharedGroup : "");
            });
          }

          /** Sets the groups mode based on the selected groups. */
          function determineClientsGroupsMode(formData: FormAttendantsData) {
            if (clientsGroupsMode() === "separate") {
              // Leave alone the separate mode.
              return;
            }
            const attendanceGroups = getSelectedAttendanceGroups(formData);
            if (attendanceGroups.length === 0 || (attendanceGroups.length === 1 && !attendanceGroups[0])) {
              setMode("none");
            } else if (attendanceGroups.length === 1) {
              setMode("shared", attendanceGroups[0]!);
            } else {
              setMode("separate");
            }
          }

          function setAttendanceGroup(formData: FormAttendantsData, clientIndex: number, groupId: string) {
            const client = formData.clients[clientIndex];
            if (client && client.clientGroupId !== groupId) {
              form.setFields(`clients.${clientIndex}.clientGroupId`, groupId);
            }
          }

          /** Sets the selected groups based on the mode and shared group. */
          function setAttendanceGroups(formData: FormAttendantsData) {
            if (clientsGroupsMode() === "separate") {
              return;
            }
            for (let i = 0; i < formData.clients.length; i++) {
              if (!formData.clients[i]!.userId || clientsGroupsMode() === "none") {
                setAttendanceGroup(formData, i, "");
              } else if (clientsGroupsMode() === "shared") {
                setAttendanceGroup(formData, i, sharedClientsGroupId() || "");
              }
            }
          }

          // Initialise mode based on the selection when the form is opened.
          determineClientsGroupsMode(form.data());

          createEffect(
            on(
              [
                () =>
                  clientsWithGroupsDataQuery.isSuccess &&
                  (!clientGroupFetcher.numSubscribedGroups() || clientGroupFetcher.dataQuery.isSuccess),
                sharedGroups,
                groupsByClientId,
                clientsGroupsMode,
                sharedClientsGroupId,
                form.data, // to nudge the form and improve reactivity
              ],
              (
                [querySuccess, sharedGroups, _groupsByClientId, _clientsGroupsMode, _sharedClientsGroupId, formData],
                _prevInput,
                prev:
                  | {
                      formData: FormAttendantsData;
                      sharedGroups: readonly string[];
                      clientsGroupsMode: ClientsGroupsMode | undefined;
                      sharedClientsGroupId: string;
                    }
                  | undefined,
              ) => {
                if (!querySuccess) {
                  // Don't do any more advanced updates without the data.
                  return prev;
                }

                const formClientsChanged =
                  prev &&
                  !(
                    formData.clients.length === prev.formData.clients.length &&
                    formData.clients.every(
                      (c1, i) =>
                        c1.userId === prev.formData.clients[i]!.userId &&
                        c1.clientGroupId === prev.formData.clients[i]!.clientGroupId,
                    )
                  );
                let clientsChanged = formClientsChanged;
                for (let i = 0; i < formData.clients.length; i++) {
                  const {userId, clientGroupId} = formData.clients[i]!;
                  if (userId) {
                    if (clientGroupId) {
                      if (!isClientInGroup(userId, clientGroupId)) {
                        // Invalid state.
                        setAttendanceGroup(
                          formData,
                          i,
                          clientsGroupsMode() === "shared" &&
                            sharedClientsGroupId() &&
                            isClientInGroup(userId, sharedClientsGroupId())
                            ? sharedClientsGroupId()
                            : "",
                        );
                        clientsChanged = true;
                      }
                    } else if (
                      formClientsChanged &&
                      clientsGroupsMode() === "shared" &&
                      sharedClientsGroupId() &&
                      isClientInGroup(userId, sharedClientsGroupId())
                    ) {
                      setAttendanceGroup(formData, i, sharedClientsGroupId());
                    }
                  }
                }
                if (clientsChanged) {
                  determineClientsGroupsMode(form.data());
                  formData = form.data();
                }
                const modeChanged = prev && clientsGroupsMode() !== prev.clientsGroupsMode;
                if (clientsGroupsMode() === "none") {
                  if (!modeChanged && sharedGroups.length && !prev?.sharedGroups.length) {
                    setMode("shared", sharedGroups[0]);
                  } else {
                    setSharedClientsGroupId("");
                  }
                } else if (clientsGroupsMode() === "shared") {
                  if (sharedGroups.length) {
                    if (sharedClientsGroupId()) {
                      if (!sharedGroups.includes(sharedClientsGroupId())) {
                        determineClientsGroupsMode(formData);
                      }
                    } else if (modeChanged) {
                      setMode(
                        "shared",
                        formData.clients.find(({clientGroupId}) => sharedGroups.includes(clientGroupId))
                          ?.clientGroupId || sharedGroups[0],
                      );
                    } else {
                      determineClientsGroupsMode(formData);
                    }
                  } else {
                    determineClientsGroupsMode(formData);
                  }
                } else {
                  setSharedClientsGroupId("");
                }
                setAttendanceGroups(form.data());
                return {
                  formData: form.data(),
                  sharedGroups,
                  clientsGroupsMode: clientsGroupsMode(),
                  sharedClientsGroupId: sharedClientsGroupId(),
                };
              },
            ),
          );
        }
      },
    ),
  );

  return (
    <div class="flex flex-col items-stretch">
      <div class="grid gap-1" style={{"grid-template-columns": "1.5fr 1.2rem 1fr"}}>
        <div class="col-span-2">
          <FieldLabel
            fieldName={props.name}
            umbrella
            label={
              <Capitalize
                text={t(`forms.meeting.field_names.${props.name}__interval`, {
                  postProcess: "interval",
                  count: form.data(props.name).filter(Boolean).length,
                })}
              />
            }
          />
        </div>
        <Show when={props.showAttendanceStatusLabel !== false}>
          <div class="flex gap-1">
            <FieldLabel
              fieldName="attendanceStatusDictId"
              umbrella
              label={(origLabel) => (
                <>
                  {origLabel} <MeetingAttendanceStatusInfoIcon />
                </>
              )}
            />
          </div>
        </Show>
        <Index each={form.data(props.name)} fallback={<EmptyValueSymbol class="col-span-full" />}>
          {(_attendant, index) => {
            const userId = () => form.data(`${props.name}.${index}.userId`);
            const priorityQueryParams = createMemo(() =>
              props.name === "clients"
                ? // eslint-disable-next-line solid/reactivity
                  autoRelatedClients.selectParamsExtension(() =>
                    // Make sure this is the same for all the client selects if there are multiple clients,
                    // to avoid sending multiple additional requests.
                    form
                      .data(props.name)
                      .map(({userId}) => userId)
                      .filter(NON_NULLABLE),
                  )
                : undefined,
            );
            const clientGroups = createMemo(() => groupsByClientId().get(userId() || "") || []);
            return (
              <Show
                when={userId() || !props.viewMode}
                fallback={<PlaceholderField name={`${props.name}.${index}.userId`} />}
              >
                <div class="col-span-full grid grid-cols-subgrid">
                  <div class={cx("col-start-1 flex items-center gap-1", conflictsFinder() ? undefined : "col-span-2")}>
                    <Switch>
                      <Match when={props.viewMode}>
                        <div class="flex items-center">
                          <PlaceholderField name={`${props.name}.${index}.userId`} />
                          <UserLink type={props.name} userId={userId()} />
                        </div>
                      </Match>
                      <Match when="edit mode">
                        <div class="flex-grow flex flex-col">
                          <TQuerySelect
                            name={`${props.name}.${index}.userId`}
                            label=""
                            {...(props.name === "staff"
                              ? modelQuerySpecs.userStaff()
                              : props.name === "clients"
                                ? modelQuerySpecs.userClient({showBirthDateWhenSelected: true})
                                : (props.name satisfies never))}
                            {...priorityQueryParams()?.()}
                            nullable={false}
                            small
                          />
                        </div>
                      </Match>
                    </Switch>
                  </div>
                  <Show when={conflictsFinder()}>
                    {(conflictsFinder) => {
                      const {ConflictsInfo} = conflictsFinder();
                      return (
                        <div class="min-h-small-input self-start flex flex-col items-center justify-center">
                          <ConflictsInfo userId={userId()} />
                        </div>
                      );
                    }}
                  </Show>
                  <div class="flex gap-1">
                    <Show
                      when={userId()}
                      fallback={
                        <>
                          <PlaceholderField name={`${props.name}.${index}.attendanceStatusDictId`} />
                          <div
                            class={cx("w-full h-full rounded border border-input-border", {
                              "bg-disabled": isFormDisabled(),
                            })}
                          />
                        </>
                      }
                    >
                      <div class="grow">
                        <DictionarySelect
                          name={`${props.name}.${index}.attendanceStatusDictId`}
                          label=""
                          dictionary="attendanceStatus"
                          itemFunc={(pos, defItem) => {
                            const item = defItem();
                            const label = () => (
                              <MeetingAttendanceStatus
                                attendanceStatusId={item.value}
                                meetingStatusId={meetingStatus()?.id}
                              />
                            );
                            return {
                              ...item,
                              label,
                              labelOnList: () => (
                                <div class="flex justify-between gap-1">
                                  {label()}
                                  <MeetingAttendanceStatusInfoIcon
                                    attendanceStatusId={item.value}
                                    meetingStatusId={meetingStatusId()}
                                  />
                                </div>
                              ),
                            };
                          }}
                          nullable={false}
                          disabled={!userId()}
                          small
                        />
                      </div>
                    </Show>
                    <Show when={!props.viewMode}>
                      {/* Show delete button for filled in rows, and for the empty row (unless it's the only row). */}
                      <Show when={form.data(props.name)[index]?.userId || index}>
                        <div>
                          <Button
                            class="secondary small !min-h-small-input"
                            title={t("actions.delete")}
                            onClick={() => form.setFields(props.name, form.data(props.name).toSpliced(index, 1))}
                          >
                            <actionIcons.Delete class="inlineIcon" />
                          </Button>
                        </div>
                      </Show>
                      {/* Show add button in the last row, unless that row is already empty. */}
                      <Show when={form.data(props.name)[index]?.userId && index === form.data(props.name).length - 1}>
                        <div>
                          <Button
                            class="secondary small !min-h-small-input"
                            title={t(`forms.meeting.add_attendant.${props.name}`)}
                            onClick={() => form.addField(props.name, createAttendant(), index + 1)}
                          >
                            <actionIcons.Add class="inlineIcon" />
                          </Button>
                        </div>
                      </Show>
                    </Show>
                  </div>
                  <Show when={props.name === "clients"}>
                    <HideableSection class="col-span-full" show={userId() && clientsGroupsMode() === "separate"}>
                      {(show) => (
                        <div class="mt-px mb-1 flex items-center gap-1">
                          <div
                            class={cx(
                              "ml-6",
                              form.data(`clients.${index}.clientGroupId`) ? undefined : "text-grey-text",
                            )}
                            use:title={capitalizeString(translations.fieldName("attendantClientGroupId"))}
                          >
                            <clientGroupIcons.ClientGroup class="text-current" size="22" />
                          </div>
                          <Show
                            when={!props.viewMode && clientGroups().length}
                            fallback={
                              <SharedClientGroupLabel
                                groupId={form.data(`clients.${index}.clientGroupId`) || undefined}
                              />
                            }
                          >
                            <div class="flex-grow">
                              <Select
                                name={`clients.${index}.clientGroupId`}
                                label=""
                                items={clientGroups().map((groupId) => ({
                                  value: groupId,
                                  label: () => <SharedClientGroupLabel groupId={groupId} />,
                                }))}
                                nullable
                                small
                                disabled={!show()}
                                placeholder={EMPTY_VALUE_SYMBOL_STRING}
                              />
                            </div>
                          </Show>
                        </div>
                      )}
                    </HideableSection>
                  </Show>
                </div>
              </Show>
            );
          }}
        </Index>
      </div>
      <Show when={props.name === "clients" && (!props.viewMode || clientsGroupsMode() === "shared")}>
        <HideableSection show={allGroups().size}>
          <ClientGroupBox class="mt-2 flex flex-col">
            <Show when={!props.viewMode || clientsGroupsMode() === "shared"}>
              <div class="flex items-baseline justify-between gap-2">
                <FieldLabel fieldName="clientsGroupsMode" umbrella />
                <Show when={!props.viewMode}>
                  <div class="self-start">
                    <SegmentedControl
                      name="clientsGroupsMode"
                      label=""
                      items={[
                        {
                          value: "none",
                          label: () => (
                            <span use:title={[translations.fieldName("clientsGroupsMode.none.desc"), {delay: 500}]}>
                              {translations.fieldName("clientsGroupsMode.none")}
                            </span>
                          ),
                        },
                        {
                          value: "shared",
                          label: () => (
                            <span
                              use:title={[
                                translations.fieldName(
                                  sharedGroups().length
                                    ? "clientsGroupsMode.shared.desc"
                                    : "clientsGroupsMode.shared.desc_no_shared_options",
                                ),
                                {delay: 500},
                              ]}
                            >
                              {translations.fieldName("clientsGroupsMode.shared")}
                            </span>
                          ),
                          disabled: !sharedGroups().length,
                        },
                        {
                          value: "separate",
                          label: () => (
                            <span use:title={[translations.fieldName("clientsGroupsMode.separate.desc"), {delay: 500}]}>
                              {translations.fieldName("clientsGroupsMode.separate")}
                            </span>
                          ),
                        },
                      ]}
                      value={clientsGroupsMode()}
                      onValueChange={setClientsGroupsMode}
                      small
                    />
                  </div>
                </Show>
              </div>
            </Show>
            <HideableSection show={clientsGroupsMode() === "shared"}>
              {(show) => (
                <div class="mt-1 flex gap-1 items-center">
                  <div use:title={capitalizeString(translations.fieldName("sharedClientsGroupId"))}>
                    <clientGroupIcons.ClientGroup size="22" />
                  </div>
                  <div class="flex-grow">
                    <Show
                      when={sharedGroups().length > 1}
                      fallback={<SharedClientGroupLabel groupId={sharedClientsGroupId()} />}
                    >
                      <Select
                        name="sharedClientsGroupId"
                        label=""
                        items={sharedGroups().map((groupId) => ({
                          value: groupId,
                          label: () => <SharedClientGroupLabel groupId={groupId} />,
                        }))}
                        value={sharedClientsGroupId()}
                        onValueChange={setSharedClientsGroupId}
                        nullable={false}
                        disabled={!show()}
                        small
                      />
                    </Show>
                  </div>
                </div>
              )}
            </HideableSection>
          </ClientGroupBox>
        </HideableSection>
      </Show>
    </div>
  );
};

export function useAttendantsCreator() {
  const {attendanceStatusDict} = useFixedDictionaries();

  function createAttendant({userId = "", clientGroupId, attendanceStatusDictId}: Partial<FormAttendantData> = {}) {
    return {
      userId,
      clientGroupId: clientGroupId || "",
      attendanceStatusDictId: attendanceStatusDictId || attendanceStatusDict()!.ok.id,
    } satisfies FormAttendantData;
  }

  function attendantsInitialValueForCreate(staff?: readonly string[]) {
    return {
      staff: staff?.map((userId) => createAttendant({userId})) || [],
      clients: [],
    } satisfies FormAttendantsData;
  }

  function attendantsInitialValueFromMeeting(
    meeting: MeetingResource,
    attendanceStatusOverride?: Partial<FormAttendantData>,
  ) {
    function getAttendants(attendantsFromMeeting: readonly (MeetingStaffResource | MeetingClientResource)[]) {
      const attendants = attendantsFromMeeting.map((attendant) =>
        createAttendant({...attendant, ...attendanceStatusOverride}),
      );
      if (attendants.length > 1) {
        // Start in multiple mode, make additional empty row.
        attendants.push(createAttendant());
      }
      return attendants;
    }
    return {
      staff: getAttendants(meeting.staff),
      clients: getAttendants(meeting.clients),
    } satisfies FormAttendantsData;
  }

  function attendantsInitialValueForEdit(meeting: MeetingResource) {
    return attendantsInitialValueFromMeeting(meeting);
  }

  function attendantsInitialValueForCreateCopy(meeting: MeetingResource) {
    return attendantsInitialValueFromMeeting(meeting, {attendanceStatusDictId: attendanceStatusDict()!.ok.id});
  }

  return {
    createAttendant,
    attendantsInitialValueForCreate,
    attendantsInitialValueForEdit,
    attendantsInitialValueForCreateCopy,
  };
}

export function getAttendantsValuesForEdit(values: Partial<FormAttendantsData>) {
  return {
    staff: values.staff?.filter(({userId}) => userId).map((staff) => ({...staff, clientGroupId: undefined})),
    clients: values.clients?.filter(({userId}) => userId),
  } satisfies Partial<MeetingResourceForPatch>;
}

export function getAttendantsValuesForCreate(values: Partial<FormAttendantsData>) {
  const {staff = [], clients = []} = getAttendantsValuesForEdit(values);
  return {staff, clients} satisfies Partial<MeetingResourceForCreate>;
}
