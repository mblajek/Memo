import {useMutation} from "@tanstack/solid-query";
import {Button, EditButton} from "components/ui/Button";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {BigSpinner} from "components/ui/Spinner";
import {SplitButton} from "components/ui/SplitButton";
import {createConfirmation} from "components/ui/confirmation";
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
import {DateTime} from "luxon";
import {For, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {CreatedByInfo} from "../facility-users/CreatedByInfo";
import {getAttendantsValuesForEdit, useAttendantsCreator} from "./MeetingAttendantsFields";
import {MeetingDeleteButton} from "./MeetingDeleteButton";
import {MeetingForm, MeetingFormType, getResourceValuesForEdit} from "./MeetingForm";
import {useMeetingWithExtraInfo} from "./meeting_api";
import {MeetingBasicData} from "./meeting_basic_data";
import {createMeetingCreateModal} from "./meeting_create_modal";
import {createMeetingSeriesCreateModal} from "./meeting_series_create_modal";
import {getMeetingTimeFullData, meetingTimeInitialValueForEdit} from "./meeting_time_controller";

export interface MeetingViewEditFormProps {
  readonly staticMeetingId: Api.Id;
  readonly viewMode: boolean;
  readonly showGoToMeetingButton?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onEdited?: (meeting: MeetingBasicData) => void;
  readonly onCreated?: (meeting: MeetingBasicData) => void;
  readonly onCloned?: (firstMeeting: MeetingBasicData, otherMeetingIds: string[]) => void;
  readonly onDeleted?: (count: number, deletedThisMeeting: boolean) => void;
  readonly onCancel?: () => void;
  /** Whether to show toast on success. Does not affect delete toast (it is always shown). Default: true. */
  readonly showToast?: boolean;
}

export const MeetingViewEditForm: VoidComponent<MeetingViewEditFormProps> = (props) => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const attributes = useAttributes();
  const {meetingStatusDict} = useFixedDictionaries();
  const {attendantsInitialValueForEdit, attendantsInitialValueForCreateCopy} = useAttendantsCreator();
  const mutationsTracker = useMutationsTracker();
  const invalidate = useInvalidator();
  const meetingCreateModal = createMeetingCreateModal();
  const seriesCreateModal = createMeetingSeriesCreateModal();
  const confirmation = createConfirmation();
  const {meetingQuery, meeting} = useMeetingWithExtraInfo(props.staticMeetingId);
  const meetingUpdateMutation = useMutation(() => ({
    mutationFn: FacilityMeeting.updateMeeting,
    meta: {isFormSubmit: true},
  }));

  async function updateMeeting(values: Partial<MeetingFormType>) {
    const origMeeting = meeting();
    const meetingPatch = transformFormValues(values);
    const origFacilityWide = !origMeeting.staff.length && !origMeeting.resources.length;
    const modifiedFacilityWide =
      !(meetingPatch.staff || origMeeting.staff).length && !(meetingPatch.resources || origMeeting.resources).length;
    if (modifiedFacilityWide && !origFacilityWide) {
      if (
        !(await confirmation.confirm({
          title: t("meetings.facility_wide_meeting.title"),
          body: t("meetings.facility_wide_meeting.body"),
          confirmText: t("forms.meeting_create.submit"),
        }))
      )
        return;
    }
    await meetingUpdateMutation.mutateAsync({id: props.staticMeetingId, ...meetingPatch});
    // eslint-disable-next-line solid/reactivity
    return () => {
      if (props.showToast ?? true) {
        toastSuccess(t("forms.meeting_edit.success"));
      }
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
      ...meetingTimeInitialValueForEdit(meeting()),
      typeDictId: meeting().typeDictId,
      statusDictId: meeting().statusDictId,
      ...attendantsInitialValueForEdit(meeting()),
      isRemote: meeting().isRemote,
      notes: meeting().notes || "",
      resources: meeting().resources.map(({resourceDictId}) => resourceDictId),
    } satisfies MeetingFormType;
  };

  function createCopyInDays(days: number) {
    meetingCreateModal.show({
      initialValues: {
        ...initialValues(),
        date: DateTime.fromISO(meeting().date).plus({days}).toISODate(),
        statusDictId: meetingStatusDict()!.planned.id,
        ...attendantsInitialValueForCreateCopy(meeting()),
        fromMeetingId: props.staticMeetingId,
      },
      onSuccess: (meeting) => props.onCreated?.(meeting),
      forceTimeEditable: !days,
      showToast: props.showToast,
    });
  }

  return (
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData {...notFoundError()}>
      <Show
        // Hide the form when another form is opened on top, to avoid duplicate element ids.
        when={!meetingCreateModal.isShown()}
      >
        <Show when={attributes() && meetingStatusDict()} fallback={<BigSpinner />}>
          <div class="flex flex-col gap-3">
            <div class="relative flex flex-col">
              <div class="flex justify-between">
                <Show when={props.showGoToMeetingButton} fallback={<span />}>
                  <LinkWithNewTabLink
                    {...getCalendarViewLinkData(`/${activeFacility()?.url}/calendar`, {meeting: meeting()})}
                  >
                    <calendarIcons.Calendar class="inlineIcon" /> {t("meetings.show_in_calendar")}
                  </LinkWithNewTabLink>
                </Show>
                <CreatedByInfo class="-mb-2" data={meeting()} />
              </div>
              <MeetingForm
                id="meeting_edit"
                initialValues={initialValues()}
                viewMode={props.viewMode}
                onViewModeChange={props.onViewModeChange}
                meeting={meeting()}
                onSubmit={updateMeeting}
                onCancel={() => {
                  if (props.viewMode || !props.onViewModeChange) {
                    props.onCancel?.();
                  } else {
                    props.onViewModeChange(true);
                  }
                }}
              />
            </div>
            <Show when={props.viewMode}>
              <div class="flex gap-1 justify-between">
                <MeetingDeleteButton
                  class="secondary small"
                  meeting={meeting()}
                  disabled={mutationsTracker.isAnyPending()}
                  onDeleted={props.onDeleted}
                />
                <div class="flex gap-1">
                  <SplitButton
                    class="secondary small"
                    onClick={() => {
                      seriesCreateModal.show({
                        id: "meeting_series_create",
                        translationsFormNames: ["meeting_series_create", "meeting_series"],
                        startMeeting: meeting(),
                        onSuccess: props.onCloned,
                        showToast: props.showToast,
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
                                  text: DateTime.fromISO(meeting().date)
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
                    {t(meeting().fromMeetingId ? "meetings.extend_series" : "meetings.create_series")}
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
export default MeetingViewEditForm;

export function transformFormValues(values: Partial<MeetingFormType>): Partial<MeetingResourceForPatch> {
  return {
    ...values,
    ...getMeetingTimeFullData(values).timeValues,
    ...getAttendantsValuesForEdit(values),
    ...getResourceValuesForEdit(values),
  };
}
