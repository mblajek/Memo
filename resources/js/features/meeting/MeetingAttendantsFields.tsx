import {Obj} from "@felte/core";
import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {Capitalize} from "components/ui/Capitalize";
import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {PlaceholderField} from "components/ui/form/PlaceholderField";
import {TQueryConfig, TQuerySelect} from "components/ui/form/TQuerySelect";
import {ACTION_ICONS, CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {cx, useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {
  MeetingAttendantResource,
  MeetingResource,
  MeetingResourceForCreate,
  MeetingResourceForPatch,
} from "data-access/memo-api/resources/meeting.resource";
import {Index, Match, Show, Switch, VoidComponent, createEffect, createMemo, on} from "solid-js";
import {Dynamic} from "solid-js/web";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";
import {UserLink} from "../facility-users/UserLink";
import {MeetingFormType} from "./MeetingForm";
import {MeetingAttendanceStatus, MeetingAttendanceStatusInfoIcon} from "./attendance_status_info";
import {useMeetingConflictsFinder} from "./meeting_conflicts_finder";
import {getMeetingTimeFullData} from "./meeting_time_controller";

export const getAttendantsSchemaPart = () => ({
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

  createEffect<readonly FormAttendantData[]>((prevAttendants) => {
    const attendants = form.data(props.name);
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
  const tquerySpec = (): TQueryConfig => {
    if (props.name === "staff")
      return {
        entityURL: `facility/${activeFacilityId()}/user/staff`,
        prefixQueryKey: FacilityStaff.keys.staff(),
      };
    if (props.name === "clients")
      return {
        entityURL: `facility/${activeFacilityId()}/user/client`,
        prefixQueryKey: FacilityClient.keys.client(),
      };
    return props.name satisfies never;
  };

  return (
    <div class="flex flex-col items-stretch">
      <div
        class="grid gap-x-1"
        style={{
          "grid-template-columns": "auto 1.5fr 1.2rem 1fr",
          "row-gap": 0,
        }}
      >
        <div class="col-span-3">
          <FieldLabel
            fieldName={props.name}
            umbrella
            label={
              <Capitalize
                text={t(`forms.meeting.fieldNames.${props.name}__interval`, {
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
          <Index each={form.data(props.name)} fallback={EMPTY_VALUE_SYMBOL}>
            {(_attendant, index) => {
              const userId = () => form.data(`${props.name}.${index}.userId`);
              return (
                <Show
                  when={userId() || !props.viewMode}
                  fallback={<PlaceholderField name={`${props.name}.${index}.userId`} />}
                >
                  <Dynamic
                    component={props.name === "staff" ? STAFF_ICONS.staff : CLIENT_ICONS.client}
                    class="col-start-1 min-h-small-input"
                    size="24"
                  />
                  <div class={conflictsFinder() ? undefined : "col-span-2"}>
                    <Switch>
                      <Match when={props.viewMode}>
                        <div class="flex items-center">
                          <PlaceholderField name={`${props.name}.${index}.userId`} />
                          <UserLink type={props.name} icon={false} userId={userId()} />
                        </div>
                      </Match>
                      <Match when={!props.viewMode}>
                        <TQuerySelect
                          name={`${props.name}.${index}.userId`}
                          label=""
                          querySpec={tquerySpec()}
                          nullable={false}
                          small
                        />
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
                            <ACTION_ICONS.delete class="inlineIcon text-current" />
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
                            <ACTION_ICONS.add class="inlineIcon text-current" />
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
