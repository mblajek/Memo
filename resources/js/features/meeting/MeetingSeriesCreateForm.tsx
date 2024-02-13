import {createMutation} from "@tanstack/solid-query";
import {ProgressBar} from "components/ui/ProgressBar";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResource, MeetingResourceForCreate} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {Show, VoidComponent, createSignal} from "solid-js";
import toast from "solid-toast";
import {useAttendantsCreator} from "./MeetingAttendantsFields";
import {MeetingSeriesForm, MeetingSeriesFormType, getMeetingSeriesDates} from "./MeetingSeriesForm";
import {MeetingChangeSuccessData} from "./meeting_change_success_data";

export interface MeetingSeriesCreateFormProps {
  readonly startMeeting: MeetingResource;
  readonly initialValues?: Partial<MeetingSeriesFormType>;
  readonly onSuccess?: (meetings: MeetingChangeSuccessData[]) => void;
  readonly onCancel?: () => void;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const MeetingSeriesCreateForm: VoidComponent<MeetingSeriesCreateFormProps> = (props) => {
  const t = useLangFunc();
  const {meetingStatusDict} = useFixedDictionaries();
  const {attendantsForCreateCopy} = useAttendantsCreator();
  const invalidate = useInvalidator();
  const meetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.createMeeting,
    meta: {isFormSubmit: true},
  }));
  const [progress, setProgress] = createSignal<{max: number; value: number}>();

  async function createMeetings(values: MeetingSeriesFormType) {
    const dates = getMeetingSeriesDates(DateTime.fromISO(props.startMeeting.date), values)
      // Skip the first meeting, it already exists.
      .slice(1);
    if (!dates.length) {
      return;
    }
    // eslint-disable-next-line solid/reactivity
    const {startMeeting} = props;
    const meetings = [];
    setProgress({max: dates.length, value: 0});
    try {
      for (const date of dates) {
        const meeting: MeetingResourceForCreate = {
          ...startMeeting,
          date: date.toISODate(),
          statusDictId: meetingStatusDict()!.planned.id,
          ...attendantsForCreateCopy(startMeeting),
          fromMeetingId: startMeeting.id,
        };
        const {id} = (await meetingMutation.mutateAsync(meeting)).data.data;
        meetings.push({...(meeting as Required<MeetingResourceForCreate>), id});
        setProgress((prev) => ({...prev!, value: prev!.value + 1}));
      }
    } finally {
      setProgress(undefined);
    }
    if (props.showToast ?? true) {
      toast.success(t("forms.meeting_series_create.success"));
    }
    props.onSuccess?.(meetings);
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facility.meetings();
  }

  const initialValues = () =>
    ({
      interval: "7",
      maxIndex: 9,
      includeDate: {},
      ...props.initialValues,
    }) satisfies MeetingSeriesFormType;

  return (
    <div class="flex flex-col items-stretch gap-2">
      <MeetingSeriesForm
        id="meeting_series_create"
        startDate={DateTime.fromISO(props.startMeeting.date)}
        initialValues={initialValues()}
        onSubmit={createMeetings}
        onCancel={props.onCancel}
      />
      <Show when={progress()}>{(progress) => <ProgressBar {...progress()} />}</Show>
    </div>
  );
};

// For lazy loading
export default MeetingSeriesCreateForm;
