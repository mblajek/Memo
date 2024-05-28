import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button, DeleteButton, EditButton} from "components/ui/Button";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {LoadingPane} from "components/ui/LoadingPane";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {BigSpinner} from "components/ui/Spinner";
import {SplitButton} from "components/ui/SplitButton";
import {createConfirmation} from "components/ui/confirmation";
import {ACTION_ICONS} from "components/ui/icons";
import {getMeetingLinkData} from "components/ui/meetings-calendar/meeting_link";
import {QueryBarrier, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {MAX_DAY_MINUTE, dayMinuteToTimeInput} from "components/utils/day_minute_util";
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
import {MeetingForm, MeetingFormType, getResourceValuesForEdit} from "./MeetingForm";
import {MeetingBasicData} from "./meeting_basic_data";
import {createMeetingCreateModal} from "./meeting_create_modal";
import {createMeetingSeriesCreateModal} from "./meeting_series_create_modal";
import {getMeetingTimeFullData} from "./meeting_time_controller";

export interface MeetingViewEditFormProps {
  readonly meetingId: Api.Id;
  readonly viewMode: boolean;
  readonly showGoToMeetingButton?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onEdited?: (meeting: MeetingBasicData) => void;
  readonly onCreated?: (meeting: MeetingBasicData) => void;
  readonly onCloned?: (firstMeeting: MeetingBasicData, otherMeetingIds: string[]) => void;
  readonly onDeleted?: (meetingId: string) => void;
  readonly onCancel?: () => void;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const MeetingViewEditForm: VoidComponent<MeetingViewEditFormProps> = (props) => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const attributes = useAttributes();
  const {meetingStatusDict} = useFixedDictionaries();
  const {attendantsInitialValueForEdit, attendantsInitialValueForCreateCopy} = useAttendantsCreator();
  const invalidate = useInvalidator();
  const meetingCreateModal = createMeetingCreateModal();
  const meetingSeriesCreateModal = createMeetingSeriesCreateModal();
  const confirmation = createConfirmation();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(props.meetingId));
  const meeting = () => meetingQuery.data!;
  const meetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.updateMeeting,
    meta: {isFormSubmit: true},
  }));
  const deleteMeetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
  }));
  const isBusy = () => meetingMutation.isPending || deleteMeetingMutation.isPending;

  async function updateMeeting(values: Partial<MeetingFormType>) {
    const origMeeting = meeting();
    const meetingPatch = {
      id: props.meetingId,
      ...transformFormValues(values),
    };
    await meetingMutation.mutateAsync(meetingPatch);
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

  async function deleteMeeting() {
    await deleteMeetingMutation.mutateAsync(props.meetingId);
    if (props.showToast ?? true) {
      toastSuccess(t("forms.meeting_delete.success"));
    }
    props.onDeleted?.(props.meetingId);
    // Important: Invalidation should happen after calling onDeleted which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  const initialValues = () => {
    return {
      date: meeting().date,
      time:
        meeting().startDayminute === 0 && meeting().durationMinutes === MAX_DAY_MINUTE
          ? {
              allDay: true,
              startTime: "",
              endTime: "",
            }
          : {
              allDay: false,
              startTime: dayMinuteToTimeInput(meeting().startDayminute),
              endTime: dayMinuteToTimeInput((meeting().startDayminute + meeting().durationMinutes) % MAX_DAY_MINUTE),
            },
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
        fromMeetingId: props.meetingId,
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
                  <LinkWithNewTabLink {...getMeetingLinkData(`/${activeFacility()?.url}/calendar`, meeting())}>
                    {t("meetings.show_in_calendar")}
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
                  if (props.onViewModeChange) {
                    props.onViewModeChange(true);
                  } else {
                    props.onCancel?.();
                  }
                }}
              />
              <LoadingPane
                isLoading={
                  // If the edit mutation is pending, the form already shows the pane.
                  deleteMeetingMutation.isPending
                }
              />
            </div>
            <Show when={props.viewMode}>
              <div class="flex gap-1 justify-between">
                <DeleteButton
                  class="secondary small"
                  confirm={() =>
                    confirmation.confirm({
                      title: t("forms.meeting_delete.formName"),
                      body: t("forms.meeting_delete.confirmationText"),
                      confirmText: t("forms.meeting_delete.submit"),
                    })
                  }
                  delete={deleteMeeting}
                  disabled={isBusy()}
                />
                <div class="flex gap-1">
                  <SplitButton
                    class="secondary small"
                    onClick={() => {
                      meetingSeriesCreateModal.show({
                        startMeeting: meeting(),
                        onSuccess: props.onCloned,
                        showToast: props.showToast,
                      });
                    }}
                    popOver={(popOver) => (
                      <SimpleMenu onClick={() => popOver().close()}>
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
                    disabled={isBusy()}
                  >
                    <ACTION_ICONS.repeat class="inlineIcon text-current" /> {t("meetings.create_series")}
                  </SplitButton>
                  <Show when={props.onViewModeChange}>
                    <EditButton
                      class="secondary small"
                      onClick={[props.onViewModeChange!, false]}
                      disabled={isBusy()}
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
