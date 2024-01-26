import {createMutation, createQuery} from "@tanstack/solid-query";
import {Button, EditButton} from "components/ui/Button";
import {MenuItem, SimpleMenu} from "components/ui/SimpleMenu";
import {BigSpinner, SmallSpinner} from "components/ui/Spinner";
import {SplitButton} from "components/ui/SplitButton";
import {createConfirmation} from "components/ui/confirmation";
import {ACTION_ICONS} from "components/ui/icons";
import {QueryBarrier, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {dayMinuteToTimeInput} from "components/utils/day_minute_util";
import {useAttributes} from "data-access/memo-api/attributes";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {Api} from "data-access/memo-api/types";
import {DateTime} from "luxon";
import {FaRegularCalendarPlus} from "solid-icons/fa";
import {Show, VoidComponent} from "solid-js";
import toast from "solid-toast";
import {useAttendantsCreator} from "./MeetingAttendantsFields";
import {MeetingForm, MeetingFormType, transformFormValues} from "./MeetingForm";
import {MeetingChangeSuccessData} from "./meeting_change_success_data";
import {createMeetingCreateModal} from "./meeting_create_modal";

interface FormParams {
  readonly id: Api.Id;
}

interface Props extends FormParams {
  readonly viewMode?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onEdited?: (meeting: MeetingChangeSuccessData) => void;
  readonly onCopyCreated?: (meeting: MeetingChangeSuccessData) => void;
  readonly onDeleted?: (meetingId: string) => void;
  readonly onCancel?: () => void;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const MeetingViewEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const dictionaries = useDictionaries();
  const {attendantsInitialValueForEdit, attendantsInitialValueForCreateCopy} = useAttendantsCreator();
  const invalidate = useInvalidator();
  const meetingCreateModal = createMeetingCreateModal();
  const confirmation = createConfirmation();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(props.id));
  const meeting = () => meetingQuery.data!;
  const meetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.updateMeeting,
    meta: {isFormSubmit: true},
  }));
  const deleteMeetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
  }));
  const isDeleting = () => deleteMeetingMutation.isPending;

  async function updateMeeting(values: MeetingFormType) {
    const meeting = {
      id: props.id,
      ...transformFormValues(values),
    };
    await meetingMutation.mutateAsync(meeting);
    if (props.showToast ?? true) {
      toast.success(t("forms.meeting_edit.success"));
    }
    props.onEdited?.(meeting as MeetingResource);
    // Important: Invalidation should happen after calling onEdited which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  async function deleteMeeting() {
    if (
      !(await confirmation.confirm({
        title: t("forms.meeting_delete.formName"),
        body: t("forms.meeting_delete.confirmationText"),
        confirmText: t("forms.meeting_delete.submit"),
      }))
    )
      return;
    await deleteMeetingMutation.mutateAsync(props.id);
    if (props.showToast ?? true) {
      toast.success(t("forms.meeting_delete.success"));
    }
    props.onDeleted?.(props.id);
    // Important: Invalidation should happen after calling onDeleted which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  const initialValues = () => {
    return {
      date: meeting().date,
      time: {
        startTime: dayMinuteToTimeInput(meeting().startDayminute),
        endTime: dayMinuteToTimeInput(meeting().startDayminute + meeting().durationMinutes),
      },
      typeDictId: meeting().typeDictId,
      statusDictId: meeting().statusDictId,
      ...attendantsInitialValueForEdit(meeting()),
      isRemote: meeting().isRemote,
      notes: meeting().notes || "",
      resources: meeting().resources.map(({resourceDictId}) => resourceDictId),
      fromMeetingId: meeting().fromMeetingId || "",
    } satisfies MeetingFormType;
  };

  function createCopyInDays(days: number) {
    meetingCreateModal.show({
      initialValues: {
        ...initialValues(),
        date: DateTime.fromISO(meeting().date).plus({days}).toISODate(),
        statusDictId: dictionaries()!.get("meetingStatus").get("planned").id,
        ...attendantsInitialValueForCreateCopy(meeting()),
        fromMeetingId: props.id,
      },
      onSuccess: props.onCopyCreated,
      showToast: props.showToast,
    });
  }

  return (
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData {...notFoundError()}>
      <Show when={attributes() && dictionaries()} fallback={<BigSpinner />}>
        <div class="flex flex-col gap-3">
          <MeetingForm
            id="meeting_edit"
            initialValues={initialValues()}
            viewMode={props.viewMode}
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
          <Show when={props.viewMode && props.onViewModeChange}>
            <div class="flex gap-1 justify-between">
              <Button class="secondary small" onClick={deleteMeeting} disabled={isDeleting()}>
                <ACTION_ICONS.delete class="inlineIcon text-current" />
                {t("actions.delete")}
                <Show when={isDeleting()}>
                  <SmallSpinner />
                </Show>
              </Button>
              <div class="flex gap-1">
                <SplitButton
                  class="secondary small"
                  onClick={[createCopyInDays, 0]}
                  popOver={(popOver) => {
                    function createItem(labelKey: string, days: number): MenuItem {
                      return {
                        label: (
                          <div class="flex justify-between gap-2">
                            <span>{t(`calendar.relative_time.${labelKey}`)}</span>
                            <span class="text-grey-text">
                              {t("parenthesised", {
                                text: DateTime.fromISO(meeting().date)
                                  .plus({days})
                                  .toLocaleString({day: "numeric", month: "long"}),
                              })}
                            </span>
                          </div>
                        ),
                        onClick: [createCopyInDays, days],
                      };
                    }
                    return (
                      <SimpleMenu
                        items={[
                          createItem("in_one_day", 1),
                          createItem("in_one_week", 7),
                          createItem("in_two_weeks", 14),
                        ]}
                        onClick={() => popOver().close()}
                      />
                    );
                  }}
                  disabled={isDeleting()}
                >
                  <FaRegularCalendarPlus class="inlineIcon text-current" /> {t("actions.meeting.make_a_copy")}
                </SplitButton>
                <EditButton
                  class="secondary small"
                  onClick={[props.onViewModeChange!, false]}
                  disabled={isDeleting()}
                />
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </QueryBarrier>
  );
};

// For lazy loading
export default MeetingViewEditForm;
