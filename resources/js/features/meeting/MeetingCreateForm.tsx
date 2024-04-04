import {createMutation} from "@tanstack/solid-query";
import {BigSpinner} from "components/ui/Spinner";
import {useLangFunc} from "components/utils";
import {toastSuccess} from "components/utils/toast";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResourceForCreate} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";
import {getAttendantsValuesForCreate, useAttendantsCreator} from "./MeetingAttendantsFields";
import {MeetingForm, MeetingFormType, getResourceValuesForCreate} from "./MeetingForm";
import {MeetingSeriesFormType, getMeetingSeriesCloneParams} from "./MeetingSeriesForm";
import {MeetingBasicData} from "./meeting_basic_data";
import {defaultMeetingSeriesInitialValues} from "./meeting_series_create";
import {getMeetingTimeFullData, meetingTimeInitialValue} from "./meeting_time_controller";

export interface MeetingCreateFormProps {
  readonly initialValues?: Partial<MeetingFormType>;
  readonly onSuccess?: (meeting: MeetingBasicData, cloneIds?: string[]) => void;
  readonly onCancel?: () => void;
  /** Whether the meeting date and time should start as editable, even if provided in the initial values. */
  readonly forceTimeEditable?: boolean;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const MeetingCreateForm: VoidComponent<MeetingCreateFormProps> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const {meetingStatusDict} = useFixedDictionaries();
  const {attendantsInitialValueForCreate} = useAttendantsCreator();
  const invalidate = useInvalidator();
  const meetingCreateMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.createMeeting,
    meta: {isFormSubmit: true},
  }));
  const meetingCloneMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.cloneMeeting,
    meta: {isFormSubmit: true},
  }));

  async function createMeetings(values: MeetingFormType) {
    const meeting = transformFormValues(values);
    const {id} = (await meetingCreateMutation.mutateAsync(meeting)).data.data;
    let cloneIds: string[] | undefined;
    if (values.createSeries) {
      const seriesParams = getMeetingSeriesCloneParams({
        startDate: DateTime.fromISO(values.date),
        values: values as MeetingSeriesFormType,
      });
      if (seriesParams.dates.length) {
        cloneIds = (await meetingCloneMutation.mutateAsync({meetingId: id, request: seriesParams})).data.data.ids;
      }
    }
    // eslint-disable-next-line solid/reactivity
    return () => {
      if (props.showToast ?? true) {
        toastSuccess(t(cloneIds?.length ? "forms.meeting_series_create.success" : "forms.meeting_create.success"));
      }
      props.onSuccess?.({...(meeting as Required<MeetingResourceForCreate>), id}, cloneIds);
      // Important: Invalidation should happen after calling onSuccess which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facility.meetings();
    };
  }

  const initialValues = () =>
    ({
      ...meetingTimeInitialValue(),
      typeDictId: "",
      statusDictId: meetingStatusDict()!.planned.id,
      ...attendantsInitialValueForCreate(),
      isRemote: false,
      notes: "",
      resources: [],
      createSeries: false,
      ...defaultMeetingSeriesInitialValues(),
      ...props.initialValues,
    }) satisfies MeetingFormType;

  return (
    <Show when={attributes() && meetingStatusDict()} fallback={<BigSpinner />}>
      <MeetingForm
        id="meeting_create"
        initialValues={initialValues()}
        forceTimeEditable={props.forceTimeEditable}
        viewMode={false}
        allowCreateSeries
        onSubmit={createMeetings}
        onCancel={props.onCancel}
      />
    </Show>
  );
};

// For lazy loading
export default MeetingCreateForm;

function transformFormValues(values: MeetingFormType): MeetingResourceForCreate {
  return {
    ...values,
    ...getMeetingTimeFullData(values).timeValues,
    ...getAttendantsValuesForCreate(values),
    ...getResourceValuesForCreate(values),
  };
}
