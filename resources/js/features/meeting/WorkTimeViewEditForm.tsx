import {useMutation} from "@tanstack/solid-query";
import {Button, EditButton} from "components/ui/Button";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {BigSpinner} from "components/ui/Spinner";
import {SplitButton} from "components/ui/SplitButton";
import {calendarIcons} from "components/ui/icons";
import {MeetingRepeatIcon} from "components/ui/meetings-calendar/MeetingRepeatIcon";
import {getCalendarViewLinkData} from "components/ui/meetings-calendar/calendar_link";
import {notFoundError} from "components/utils/NotFoundError";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {useLangFunc} from "components/utils/lang";
import {useMutationsTracker} from "components/utils/mutations_tracker";
import {skipUndefinedValues} from "components/utils/object_util";
import {toastSuccess} from "components/utils/toast";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResourceForPatch} from "data-access/memo-api/resources/meeting.resource";
import {Api, RequiredNonNullable} from "data-access/memo-api/types";
import {SUBTYPE_FACILITY_WIDE, WorkTimeFormSubtype} from "features/meeting/work_time_form_subtype";
import {DateTime} from "luxon";
import {For, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {CreatedByInfo} from "../facility-users/CreatedByInfo";
import {MeetingDeleteButton} from "./MeetingDeleteButton";
import {WorkTimeForm, WorkTimeFormType} from "./WorkTimeForm";
import {WorkTimeStaff} from "./WorkTimeStaff";
import {useMeetingWithExtraInfo} from "./meeting_api";
import {MeetingBasicData} from "./meeting_basic_data";
import {createMeetingSeriesCreateModal} from "./meeting_series_create_modal";
import {getMeetingTimeFullData, meetingTimeInitialValueForEdit} from "./meeting_time_controller";
import {createWorkTimeCreateModal} from "./work_time_create_modal";

export interface WorkTimeViewEditFormProps {
  readonly staticMeetingId: Api.Id;
  readonly subtype: WorkTimeFormSubtype;
  readonly viewMode: boolean;
  readonly showGoToMeetingButton?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onEdited?: (meeting: MeetingBasicData) => void;
  readonly onCreated?: (meeting: MeetingBasicData) => void;
  readonly onCloned?: (firstMeeting: MeetingBasicData, otherMeetingIds: Api.Id[]) => void;
  readonly onDeleted?: (count: number, deletedThisWorkTime: boolean) => void;
  readonly onCancel?: () => void;
}

export const WorkTimeViewEditForm: VoidComponent<WorkTimeViewEditFormProps> = (props) => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const attributes = useAttributes();
  const {meetingStatusDict} = useFixedDictionaries();
  const mutationsTracker = useMutationsTracker();
  const invalidate = useInvalidator();
  const workTimeCreateModal = createWorkTimeCreateModal();
  const seriesCreateModal = createMeetingSeriesCreateModal();
  const {meetingQuery, meeting: workTime} = useMeetingWithExtraInfo(props.staticMeetingId);
  const meetingUpdateMutation = useMutation(() => ({
    mutationFn: FacilityMeeting.updateMeeting,
    meta: {isFormSubmit: true},
  }));

  function transformFormValues(values: Partial<WorkTimeFormType>): Partial<MeetingResourceForPatch> {
    return {
      ...values,
      ...getMeetingTimeFullData(values).timeValues,
    };
  }

  async function updateWorkTime(values: Partial<WorkTimeFormType>) {
    const origMeeting = workTime();
    const meetingPatch = transformFormValues(values);
    await meetingUpdateMutation.mutateAsync({id: props.staticMeetingId, ...meetingPatch});
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t(`forms.${props.subtype.formId}.success`));
      props.onEdited?.({
        ...origMeeting,
        ...skipUndefinedValues(meetingPatch as RequiredNonNullable<MeetingResourceForPatch>),
      });
      // Important: Invalidation should happen after calling onEdited which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facility.meetings();
    };
  }

  const initialValues = () => {
    return {
      ...meetingTimeInitialValueForEdit(workTime()),
      notes: workTime().notes || "",
    } satisfies WorkTimeFormType;
  };

  function createCopyInDays(days: number) {
    workTimeCreateModal.show({
      initialValues: {
        ...initialValues(),
        date: DateTime.fromISO(workTime().date).plus({days}).toISODate(),
        fromMeetingId: props.staticMeetingId,
      },
      subtype: {typeDictId: props.subtype.typeDictId, staff: props.subtype.staff},
      availableStaff: props.subtype.staff === SUBTYPE_FACILITY_WIDE ? undefined : props.subtype.staff.id,
      onSuccess: (meeting) => props.onCreated?.(meeting),
    });
  }

  return (
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData {...notFoundError()}>
      <Show
        // Hide the form when another form is opened on top, to avoid duplicate element ids.
        when={!workTimeCreateModal.isShown()}
      >
        <Show when={attributes() && meetingStatusDict()} fallback={<BigSpinner />}>
          <div class="flex flex-col gap-3">
            <div class="relative flex flex-col gap-1">
              <div class="flex justify-between">
                <WorkTimeStaff staff={props.subtype.staff} />
                <Show when={props.showGoToMeetingButton} fallback={<span />}>
                  <LinkWithNewTabLink
                    {...getCalendarViewLinkData(`/${activeFacility()?.url}/admin/time-tables`, {meeting: workTime()})}
                  >
                    <calendarIcons.Calendar class="inlineIcon" /> {t("meetings.show_in_calendar")}
                  </LinkWithNewTabLink>
                </Show>
                <CreatedByInfo class="-mb-2" data={workTime()} />
              </div>
              <WorkTimeForm
                id={props.subtype.formId}
                subtype={props.subtype}
                initialValues={initialValues()}
                viewMode={props.viewMode}
                onViewModeChange={props.onViewModeChange}
                meeting={workTime()}
                onSubmit={updateWorkTime}
                onCancel={() => {
                  if (props.onViewModeChange) {
                    props.onViewModeChange(true);
                  } else {
                    props.onCancel?.();
                  }
                }}
              />
            </div>
            <Show when={props.viewMode}>
              <div class="flex gap-1 justify-between">
                <MeetingDeleteButton
                  class="secondary small"
                  disabled={mutationsTracker.isAnyPending()}
                  meeting={workTime()}
                  onDeleted={props.onDeleted}
                />
                <div class="flex gap-1">
                  <SplitButton
                    class="secondary small"
                    onClick={() => {
                      seriesCreateModal.show({
                        id: "work_time_series_create",
                        translationsFormNames: [
                          "work_time_series_create",
                          "work_time_series",
                          "meeting_series_create",
                          "meeting_series",
                        ],
                        startMeeting: workTime(),
                        initialValues: {seriesInterval: "1d"},
                        onSuccess: props.onCloned,
                      });
                    }}
                    popOver={(popOver) => (
                      <SimpleMenu onClick={popOver.close}>
                        <Button onClick={[createCopyInDays, 0]}>{t("meetings.create_copy.any")}</Button>
                        <For
                          each={
                            [
                              ["in_one_day", 1],
                              ["in_one_week", 7],
                              ["in_two_weeks", 14],
                            ] as const
                          }
                        >
                          {([labelKey, days]) => (
                            <Button class="flex justify-between gap-2" onClick={[createCopyInDays, days]}>
                              <span>{t(`meetings.create_copy.${labelKey}`)}</span>
                              <span class="text-grey-text">
                                {t("parenthesised", {
                                  text: DateTime.fromISO(workTime().date)
                                    .plus({days})
                                    .toLocaleString({day: "numeric", month: "long"}),
                                })}
                              </span>
                            </Button>
                          )}
                        </For>
                      </SimpleMenu>
                    )}
                    disabled={mutationsTracker.isAnyPending()}
                  >
                    <MeetingRepeatIcon class="inlineIcon" />{" "}
                    {t(workTime().fromMeetingId ? "meetings.extend_series" : "meetings.create_series")}
                  </SplitButton>
                  <Show when={props.onViewModeChange}>
                    <EditButton
                      class="secondary small"
                      onClick={[props.onViewModeChange!, false]}
                      disabled={mutationsTracker.isAnyPending()}
                    />
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </Show>
    </QueryBarrier>
  );
};

// For lazy loading
export default WorkTimeViewEditForm;
