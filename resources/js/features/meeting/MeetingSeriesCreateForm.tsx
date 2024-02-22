import {createMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {VoidComponent} from "solid-js";
import toast from "solid-toast";
import {
  MeetingSeriesForm,
  MeetingSeriesFormType,
  getMeetingSeriesCloneParams,
  numMeetingsToSeriesLength,
} from "./MeetingSeriesForm";
import {MeetingChangeSuccessData} from "./meeting_change_success_data";

export interface MeetingSeriesCreateFormProps {
  readonly startMeeting: MeetingResource;
  readonly initialValues?: Partial<MeetingSeriesFormType>;
  readonly onSuccess?: (firstMeeting: MeetingChangeSuccessData, otherMeetingIds: string[]) => void;
  readonly onCancel?: () => void;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const MeetingSeriesCreateForm: VoidComponent<MeetingSeriesCreateFormProps> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const meetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.cloneMeeting,
    meta: {isFormSubmit: true},
  }));

  async function createMeetings(values: MeetingSeriesFormType) {
    const params = getMeetingSeriesCloneParams({startDate: DateTime.fromISO(props.startMeeting.date), values});
    if (!params.dates.length) {
      return;
    }
    const ids = (await meetingMutation.mutateAsync({meetingId: props.startMeeting.id, request: params})).data.data.ids;
    if (props.showToast ?? true) {
      toast.success(t("forms.meeting_series_create.success"));
    }
    props.onSuccess?.(
      {
        ...props.startMeeting,
        id: ids[0]!,
        date: params.dates[0]!,
      },
      ids.slice(1),
    );
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  const initialValues = () =>
    ({
      interval: "7d",
      seriesLength: numMeetingsToSeriesLength(10),
      includeDate: {},
      ...props.initialValues,
    }) satisfies MeetingSeriesFormType;

  return (
    <MeetingSeriesForm
      id="meeting_series_create"
      startDate={DateTime.fromISO(props.startMeeting.date)}
      initialValues={initialValues()}
      onSubmit={createMeetings}
      onCancel={props.onCancel}
    />
  );
};

// For lazy loading
export default MeetingSeriesCreateForm;
