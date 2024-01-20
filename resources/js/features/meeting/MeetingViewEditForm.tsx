import {createMutation, createQuery} from "@tanstack/solid-query";
import {BigSpinner} from "components/ui/Spinner";
import {createConfirmation} from "components/ui/confirmation";
import {QueryBarrier, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {dayMinuteToTimeInput} from "components/utils/day_minute_util";
import {useAttributes} from "data-access/memo-api/attributes";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {Show, VoidComponent} from "solid-js";
import toast from "solid-toast";
import {getInitialAttendantsForEdit} from "./MeetingAttendantsFields";
import {MeetingForm, MeetingFormType, transformFormValues} from "./MeetingForm";

interface FormParams {
  readonly id: Api.Id;
}

interface Props extends FormParams {
  readonly viewMode?: boolean;
  readonly onViewModeChange?: (viewMode: boolean) => void;
  readonly onEdited?: () => void;
  readonly onDeleted?: () => void;
  readonly onCancel?: () => void;
}

export const MeetingViewEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const dictionaries = useDictionaries();
  const invalidate = useInvalidator();
  const confirmation = createConfirmation();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(props.id));
  const meetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.updateMeeting,
    meta: {isFormSubmit: true},
  }));
  const deleteMeetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
  }));

  async function updateMeeting(values: MeetingFormType) {
    await meetingMutation.mutateAsync({
      id: props.id,
      ...transformFormValues(values),
    });
    toast.success(t("forms.meeting_edit.success"));
    props.onEdited?.();
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
    toast.success(t("forms.meeting_delete.success"));
    props.onDeleted?.();
    // Important: Invalidation should happen after calling onDeleted which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  const initialValues = () => {
    const meeting = meetingQuery.data;
    return meeting
      ? ({
          ...meeting,
          time: {
            startTime: dayMinuteToTimeInput(meeting.startDayminute),
            endTime: dayMinuteToTimeInput(meeting.startDayminute + meeting.durationMinutes),
          },
          ...getInitialAttendantsForEdit(meeting),
          notes: meeting.notes || "",
          resources: meeting.resources.map(({resourceDictId}) => resourceDictId),
        } satisfies MeetingFormType)
      : {};
  };

  return (
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData {...notFoundError()}>
      <Show when={attributes() && dictionaries()} fallback={<BigSpinner />}>
        <MeetingForm
          id="meeting_edit"
          initialValues={initialValues()}
          viewMode={props.viewMode}
          onViewModeChange={props.onViewModeChange}
          onSubmit={updateMeeting}
          onDelete={deleteMeeting}
          isDeleting={deleteMeetingMutation.isPending}
          onCancel={props.onCancel}
        />
      </Show>
    </QueryBarrier>
  );
};

// For lazy loading
export default MeetingViewEditForm;
