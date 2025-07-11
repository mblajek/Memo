import {Obj} from "@felte/core";
import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {Capitalize, capitalizeString} from "components/ui/Capitalize";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {HideableSection} from "components/ui/HideableSection";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {DocsModalInfoIcon, createDocsModal} from "components/ui/docs_modal";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {PlaceholderField} from "components/ui/form/PlaceholderField";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {Select} from "components/ui/form/Select";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {actionIcons, clientGroupIcons} from "components/ui/icons";
import {EMPTY_VALUE_SYMBOL_STRING} from "components/ui/symbols";
import {title} from "components/ui/title";
import {NON_NULLABLE} from "components/utils/array_filter";
import {cx} from "components/utils/classnames";
import {useLangFunc} from "components/utils/lang";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {toPlainObject} from "components/utils/object_util";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {
  MeetingClientResource,
  MeetingResource,
  MeetingResourceForCreate,
  MeetingResourceForPatch,
  MeetingStaffResource,
} from "data-access/memo-api/resources/meeting.resource";
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
import {z} from "zod";
import {ClientGroupBox} from "../client/ClientGroupBox";
import {SharedClientGroupLabel} from "../client/SharedClientGroupLabel";
import {useClientGroupFetcher} from "../client/client_group_fetcher";
import {UserLink, useUserHrefs} from "../facility-users/UserLink";
import {useAutoRelatedClients} from "../facility-users/auto_releated_clients";
import {MeetingFormType} from "./MeetingForm";
import {MeetingAttendanceStatus, MeetingAttendanceStatusInfoIcon} from "./attendance_status_info";
import {useMeetingAttendantsClients} from "./meeting_attendants_clients";
import {useMeetingConflictsFinder} from "./meeting_conflicts_finder";
import {getMeetingTimeFullData} from "./meeting_time_controller";

type _Directives = typeof title;

export const getAttendantsSchemaPart = () =>
  z.object({
    staff: getAttendantsSchema(),
    clients: getAttendantsSchema(),
  });

export const getNotificationSchema = () =>
  z.object({
    notificationMethodDictId: z.string(),
    id: z.string().optional(),
    status: z.string().optional(),
    scheduledAt: z.string().optional(),
  });

const getAttendantsSchema = () =>
  z.array(
    z.object({
      userId: z.string(),
      clientGroupId: z.string(),
      attendanceStatusDictId: z.string(),
      notifications: z.array(getNotificationSchema()).optional(),
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

interface FormAttendantData
  extends Pick<MeetingStaffResource & MeetingClientResource, "userId" | "clientGroupId" | "attendanceStatusDictId"> {
  notifications?: z.infer<ReturnType<typeof getNotificationSchema>>[];
}

export const MeetingAttendantsFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const {createAttendant} = useAttendantsCreator();
  const modelQuerySpecs = useModelQuerySpecs();
  const autoRelatedClients = useAutoRelatedClients();
  const clientGroupFetcher = useClientGroupFetcher();
  const docsModal = createDocsModal();
  const userHrefs = useUserHrefs();
  const {form, translations, isFormDisabled} = useFormContext<MeetingFormType>();
  const meetingStatusId = () => form.data("statusDictId");
  const meetingStatus = () => (meetingStatusId() ? dictionaries()?.getPositionById(meetingStatusId()) : undefined);
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

  const {selectedClientIds, selectedClientsDataQuery, selectedClients} = useMeetingAttendantsClients();
  const groupsByClientId = createMemo((): ReadonlyMap<string, readonly string[]> => {
    const map = new Map<string, readonly string[]>();
    for (const client of selectedClients()) {
      map.set(client.id, client.groupIds);
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
  const sharedGroups = createMemo((): readonly string[] =>
    [...allGroups().keys()].filter((groupId) =>
      selectedClientIds().every((clientId) => isClientInGroup(clientId, groupId)),
    ),
  );

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
            if (clientsGroupsMode() === "separate" && selectedClientIds().length > 1) {
              // Leave alone the separate mode.
              return;
            }
            const attendanceGroups = getSelectedAttendanceGroups(formData);
            if (attendanceGroups.length === 0 || (attendanceGroups.length === 1 && !attendanceGroups[0])) {
              setMode("none");
            } else if (attendanceGroups.length === 1) {
              setMode("shared", attendanceGroups[0]);
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
                () => props.viewMode,
                () =>
                  selectedClientsDataQuery.isSuccess &&
                  (!clientGroupFetcher.numSubscribedGroups() || clientGroupFetcher.dataQuery.isSuccess),
                sharedGroups,
                groupsByClientId,
                clientsGroupsMode,
                sharedClientsGroupId,
                form.data, // to nudge the form and improve reactivity
              ],
              (
                [
                  viewMode,
                  querySuccess,
                  sharedGroups,
                  _groupsByClientId,
                  _clientsGroupsMode,
                  _sharedClientsGroupId,
                  formData,
                ],
                _prevInput,
                prev:
                  | {
                      formData: FormAttendantsData;
                      sharedGroups: readonly string[];
                      groupsByClientId: ReadonlyMap<string, readonly string[]>;
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
                if (!viewMode) {
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
                      } else if (formClientsChanged) {
                        if (clientsGroupsMode() === "shared") {
                          if (sharedClientsGroupId() && isClientInGroup(userId, sharedClientsGroupId())) {
                            setAttendanceGroup(formData, i, sharedClientsGroupId());
                          }
                        } else if (clientsGroupsMode() === "separate") {
                          const dupClient = formData.clients.find((c, j) => c.userId === userId && j !== i);
                          if (dupClient) {
                            setAttendanceGroup(formData, i, dupClient.clientGroupId);
                          } else {
                            const prevClient = prev?.formData.clients.find((c) => c.userId === userId);
                            if (!prevClient) {
                              setAttendanceGroup(formData, i, groupsByClientId().get(userId)?.[0] || "");
                            }
                          }
                        }
                      } else if (
                        clientsGroupsMode() === "separate" &&
                        groupsByClientId().has(userId) &&
                        !prev?.groupsByClientId.has(userId)
                      ) {
                        setAttendanceGroup(formData, i, groupsByClientId().get(userId)![0] || "");
                      }
                    }
                  }
                  if (clientsChanged) {
                    determineClientsGroupsMode(form.data());
                    formData = form.data();
                  }
                }
                const modeChanged = prev && clientsGroupsMode() !== prev.clientsGroupsMode;
                if (clientsGroupsMode() === "none") {
                  if (!props.viewMode && !modeChanged && sharedGroups.length && !prev?.sharedGroups.length) {
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
                    } else if (!props.viewMode && modeChanged) {
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
                  if (prev?.clientsGroupsMode === "none" && !props.viewMode) {
                    for (let i = 0; i < formData.clients.length; i++) {
                      setAttendanceGroup(formData, i, groupsByClientId().get(formData.clients[i]!.userId)?.[0] || "");
                    }
                  }
                  determineClientsGroupsMode(formData);
                }
                setAttendanceGroups(form.data());
                return {
                  formData: toPlainObject(form.data()),
                  sharedGroups,
                  groupsByClientId: groupsByClientId(),
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
      <div class="grid gap-1" style={{"grid-template-columns": "1.5fr 1fr"}}>
        <div>
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
                  {origLabel} <MeetingAttendanceStatusInfoIcon docsModal={docsModal} />
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
            const clientGroupId = () =>
              props.name === "clients" ? form.data(`clients.${index}.clientGroupId`) : undefined;
            return (
              <Show
                when={userId() || !props.viewMode}
                fallback={<PlaceholderField name={`${props.name}.${index}.userId`} />}
              >
                <div class="col-span-full grid grid-cols-subgrid">
                  <div class="flex gap-1 items-start">
                    <Switch>
                      <Match when={props.viewMode}>
                        <div class="flex-grow flex items-center">
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
                        <Show when={userId()}>
                          {(userId) => (
                            <div class="py-0.5">
                              <LinkWithNewTabLink
                                href={
                                  props.name === "staff"
                                    ? userHrefs.staffHref(userId())
                                    : userHrefs.clientHref(userId())
                                }
                                sameTabLink={false}
                                newTabLink
                              />
                            </div>
                          )}
                        </Show>
                      </Match>
                    </Switch>
                    <Switch>
                      <Match when={conflictsFinder()}>
                        {(conflictsFinder) => {
                          const {ConflictsInfo} = conflictsFinder();
                          return (
                            <div class="min-h-small-input self-start flex flex-col items-center justify-center">
                              <ConflictsInfo userId={userId()} />
                            </div>
                          );
                        }}
                      </Match>
                      <Match
                        when={props.name === "clients" && clientsGroupsMode() === "separate" && clientGroups().length}
                      >
                        <Button
                          class="min-h-small-input self-start"
                          title={
                            <>
                              <Show
                                when={clientGroupId()}
                                fallback={<p>{translations.fieldName("attendantClientGroupId.none")}</p>}
                              >
                                {(clientGroupId) => (
                                  <>
                                    <p>{translations.fieldName("attendantClientGroupId.some")}</p>
                                    <p>
                                      <clientGroupIcons.ClientGroup size="18" class="inlineIcon" />{" "}
                                      <SharedClientGroupLabel groupId={clientGroupId()} />
                                    </p>
                                  </>
                                )}
                              </Show>
                              <Show when={!props.viewMode}>
                                <p>{translations.fieldName("attendantClientGroupId.click_to_toggle")}</p>
                              </Show>
                            </>
                          }
                          onClick={() =>
                            form.setFields(`clients.${index}.clientGroupId`, clientGroupId() ? "" : clientGroups()[0])
                          }
                          disabled={props.viewMode}
                        >
                          <clientGroupIcons.ClientGroup
                            class={clientGroupId() ? "text-black" : "text-gray-400"}
                            size="20"
                          />
                        </Button>
                      </Match>
                      <Match when={props.name === "clients" && clientGroupId()}>
                        <div
                          class="min-h-small-input self-start flex flex-col items-center justify-center"
                          use:title={
                            <div>
                              <Capitalize
                                text={t("with_colon", {text: translations.fieldName("attendantClientGroupId")})}
                              />
                              <div>
                                <SharedClientGroupLabel groupId={clientGroupId()} />
                              </div>
                            </div>
                          }
                        >
                          <clientGroupIcons.ClientGroup size="20" />
                        </div>
                      </Match>
                    </Switch>
                  </div>
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
                                    docsModal={docsModal}
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
                    <HideableSection
                      class="col-span-full"
                      show={
                        userId() && clientsGroupsMode() === "separate" && !props.viewMode && clientGroups().length > 1
                      }
                    >
                      {({show}) => (
                        <div class="mt-px mb-1 flex items-center gap-1">
                          <div
                            class="ml-6"
                            use:title={<Capitalize text={translations.fieldName("attendantClientGroupId")} />}
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
          <ClientGroupBox class="mt-4 flex flex-col">
            <Show when={!props.viewMode || clientsGroupsMode() === "shared"}>
              <div class="flex justify-between items-center gap-2">
                <div class="flex gap-1">
                  <FieldLabel fieldName="clientsGroupsMode" umbrella />
                  <DocsModalInfoIcon href="/help/meeting-client-groups" />
                </div>
                <Show when={!props.viewMode}>
                  <div class="self-start">
                    <SegmentedControl
                      name="clientsGroupsMode"
                      label=""
                      items={[
                        {
                          value: "none",
                          label: () => (
                            <span
                              use:title={[
                                translations.fieldName("clientsGroupsMode.none.desc"),
                                {delay: [800, undefined]},
                              ]}
                            >
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
                                  selectedClientIds().length === 1
                                    ? "clientsGroupsMode.shared_one_client.desc"
                                    : sharedGroups().length
                                      ? "clientsGroupsMode.shared.desc"
                                      : "clientsGroupsMode.shared.desc_no_shared_options",
                                ),
                                {delay: [800, undefined]},
                              ]}
                            >
                              {translations.fieldName(
                                selectedClientIds().length === 1
                                  ? "clientsGroupsMode.shared_one_client"
                                  : "clientsGroupsMode.shared",
                              )}
                            </span>
                          ),
                          disabled: !sharedGroups().length,
                        },
                        selectedClientIds().length > 1
                          ? {
                              value: "separate",
                              label: () => (
                                <span
                                  use:title={[
                                    translations.fieldName("clientsGroupsMode.separate.desc"),
                                    {delay: [800, undefined]},
                                  ]}
                                >
                                  {translations.fieldName("clientsGroupsMode.separate")}
                                </span>
                              ),
                            }
                          : undefined,
                      ].filter(NON_NULLABLE)}
                      value={clientsGroupsMode()}
                      onValueChange={setClientsGroupsMode}
                      small
                    />
                  </div>
                </Show>
              </div>
            </Show>
            <HideableSection show={clientsGroupsMode() === "shared"}>
              {({show}) => (
                <div class="mt-1 grid gap-x-1" style={{"grid-template-columns": "auto 1fr"}}>
                  <div
                    class="flex items-center"
                    use:title={capitalizeString(translations.fieldName("sharedClientsGroupId"))}
                  >
                    <clientGroupIcons.ClientGroup size="22" />
                  </div>
                  <div>
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
                  <Show when={!props.viewMode}>
                    <div class="col-start-2 text-sm">
                      <Switch>
                        <Match when={clientsGroupsMode() !== "shared" || !sharedClientsGroupId()}>&nbsp;</Match>
                        <Match
                          when={allGroups()
                            .get(sharedClientsGroupId())?.()
                            ?.some((clientId) => !selectedClientIds().includes(clientId))}
                        >
                          <Button
                            class="linkLike p-0"
                            onClick={() => {
                              let index = selectedClientIds().length;
                              for (const clientId of allGroups().get(sharedClientsGroupId())?.() || []) {
                                if (!selectedClientIds().includes(clientId)) {
                                  form.addField("clients", createAttendant({userId: clientId}), index++);
                                }
                              }
                            }}
                          >
                            {translations.fieldName("sharedClientsGroupId.addAll")}
                          </Button>
                        </Match>
                        <Match when="all added">
                          <div class="text-grey-text">{translations.fieldName("sharedClientsGroupId.allAdded")}</div>
                        </Match>
                      </Switch>
                    </div>
                  </Show>
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

  function createAttendant({
    userId = "",
    clientGroupId,
    notifications,
    attendanceStatusDictId,
  }: Partial<FormAttendantData> = {}) {
    return {
      userId,
      clientGroupId: clientGroupId || "",
      notifications,
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
        createAttendant({
          ...attendant,
          notifications: [...((attendant as Partial<MeetingClientResource>).notifications || [])],
          ...attendanceStatusOverride,
        }),
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
    staff: values.staff
      ?.filter(({userId}) => userId)
      .map((staff) => ({...staff, clientGroupId: undefined, notifications: undefined})),
    clients: values.clients
      ?.filter(({userId}) => userId)
      .map((client) => ({
        ...client,
        notifications: (client.notifications || []).map((n) => ({
          notificationMethodDictId: n.notificationMethodDictId,
        })),
      })),
  } satisfies Partial<MeetingResourceForPatch>;
}

export function getAttendantsValuesForCreate(values: Partial<FormAttendantsData>) {
  const {staff = [], clients = []} = getAttendantsValuesForEdit(values);
  return {staff, clients} satisfies Partial<MeetingResourceForCreate>;
}
