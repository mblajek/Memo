import {Obj} from "@felte/core";
import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {Capitalize} from "components/ui/Capitalize";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {PlaceholderField} from "components/ui/form/PlaceholderField";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {actionIcons} from "components/ui/icons";
import {EmptyValueSymbol} from "components/ui/symbols";
import {NON_NULLABLE, cx, useLangFunc} from "components/utils";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {
  MeetingAttendantResource,
  MeetingResource,
  MeetingResourceForCreate,
  MeetingResourceForPatch,
} from "data-access/memo-api/resources/meeting.resource";
import {Index, Match, Show, Switch, VoidComponent, createComputed, createEffect, createMemo, on} from "solid-js";
import {z} from "zod";
import {UserLink} from "../facility-users/UserLink";
import {useAutoRelatedClients} from "../facility-users/auto_releated_clients";
import {MeetingFormType} from "./MeetingForm";
import {MeetingAttendanceStatus, MeetingAttendanceStatusInfoIcon} from "./attendance_status_info";
import {useMeetingConflictsFinder} from "./meeting_conflicts_finder";
import {getMeetingTimeFullData} from "./meeting_time_controller";

export const getAttendantsSchemaPart = () =>
  z.object({
    staff: getAttendantsSchema(),
    clients: getAttendantsSchema(),
  });

const getAttendantsSchema = () =>
  z.array(
    z.object({
      userId: z.string(),
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

type FormAttendantData = Pick<MeetingAttendantResource, "userId" | "attendanceStatusDictId">;

export const MeetingAttendantsFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const {createAttendant} = useAttendantsCreator();
  const modelQuerySpecs = useModelQuerySpecs();
  const autoRelatedClients = useAutoRelatedClients();
  const {form, isFormDisabled} = useFormContext<MeetingFormType>();
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

  // For some reason the form sometimes fails to propagate events from the selects. Nudge the data just in case.
  createComputed(
    on(
      // eslint-disable-next-line solid/reactivity
      createMemo(() =>
        form
          .data(props.name)
          .map(({userId}) => userId)
          .join(""),
      ),
      () => form.setData((d) => d),
    ),
  );
  const attendantsMemo = createMemo(() => form.data(props.name), [], {
    equals: (a, b) => a.length === b.length && a.every((v, i) => v.userId === b[i]!.userId),
  });
  createEffect<readonly FormAttendantData[]>((prevAttendants) => {
    const attendants = attendantsMemo();
    // When in edit mode, add an empty row at the end in the following situations:
    if (
      !props.viewMode &&
      // there are no rows, or...
      (!attendants.length ||
        // ...the last row was empty and it got filled in, but it was not the only row
        // (in case of one row, the component is in "one row mode" and doesn't add rows automatically).
        (prevAttendants &&
          attendants.length > 1 &&
          attendants.length === prevAttendants.length &&
          !prevAttendants.at(-1)?.userId &&
          attendants.at(-1)!.userId))
    )
      form.addField(props.name, createAttendant());
    return attendants;
  });

  return (
    <div class="flex flex-col items-stretch">
      <div
        class="grid gap-x-1"
        style={{
          "grid-template-columns": "1.5fr 1.2rem 1fr",
          "row-gap": 0,
        }}
      >
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
        <div class="col-span-full grid grid-cols-subgrid gap-1 span">
          <Index each={form.data(props.name)} fallback={<EmptyValueSymbol />}>
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
              return (
                <Show
                  when={userId() || !props.viewMode}
                  fallback={<PlaceholderField name={`${props.name}.${index}.userId`} />}
                >
                  <div class={cx("col-start-1 flex items-center gap-1", conflictsFinder() ? undefined : "col-span-2")}>
                    <Switch>
                      <Match when={props.viewMode}>
                        <div class="flex items-center">
                          <PlaceholderField name={`${props.name}.${index}.userId`} />
                          <UserLink type={props.name} userId={userId()} />
                        </div>
                      </Match>
                      <Match when={!props.viewMode}>
                        <div class="flex-grow">
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
                </Show>
              );
            }}
          </Index>
        </div>
      </div>
    </div>
  );
};

export function useAttendantsCreator() {
  const {attendanceStatusDict} = useFixedDictionaries();

  function createAttendant({userId = "", attendanceStatusDictId}: Partial<FormAttendantData> = {}) {
    return {
      userId,
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
    function getAttendants(attendantsFromMeeting: readonly FormAttendantData[]) {
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
    staff: values.staff?.filter(({userId}) => userId),
    clients: values.clients?.filter(({userId}) => userId),
  } satisfies Partial<MeetingResourceForPatch>;
}

export function getAttendantsValuesForCreate(values: Partial<FormAttendantsData>) {
  const {staff = [], clients = []} = getAttendantsValuesForEdit(values);
  return {staff, clients} satisfies Partial<MeetingResourceForCreate>;
}
