import {createMutation, createQuery} from "@tanstack/solid-query";
import {BigSpinner} from "components/ui/Spinner";
import {QueryBarrier, useLangFunc} from "components/utils";
import {dayMinuteToTimeInput} from "components/utils/day_minute_util";
import {useAttributes} from "data-access/memo-api/attributes";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {Api} from "data-access/memo-api/types";
import {Show, VoidComponent} from "solid-js";
import toast from "solid-toast";
import {getInitialAttendantsForEdit} from "./MeetingAttendantsFields";
import {MeetingForm, MeetingFormType, transformFormValues} from "./MeetingForm";

interface FormParams {
  readonly id: Api.Id;
}

interface Props extends FormParams {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const MeetingEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const dictionaries = useDictionaries();
  const invalidate = FacilityMeeting.useInvalidator();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(props.id));
  const meetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.updateMeeting,
    meta: {isFormSubmit: true},
  }));

  async function updateMeeting(values: MeetingFormType) {
    await meetingMutation.mutateAsync({
      id: props.id,
      ...transformFormValues(values),
    });
    toast.success(t("forms.meeting_edit.success"));
    props.onSuccess?.();
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.meetings();
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
    <QueryBarrier queries={[meetingQuery]} ignoreCachedData>
      <Show when={attributes() && dictionaries()} fallback={<BigSpinner />}>
        <MeetingForm
          id="meeting_edit"
          initialValues={initialValues()}
          onSubmit={updateMeeting}
          onCancel={props.onCancel}
        />
      </Show>
    </QueryBarrier>
  );
};

// For lazy loading
export default MeetingEditForm;
