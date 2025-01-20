import {createMutation} from "@tanstack/solid-query";
import {FormProps} from "components/felte-form/FelteForm";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {DateTime} from "luxon";
import {VoidComponent} from "solid-js";
import {MeetingSeriesForm, MeetingSeriesFormType, getMeetingSeriesCloneParams} from "./MeetingSeriesForm";
import {MeetingWithExtraInfo} from "./meeting_api";
import {MeetingBasicData} from "./meeting_basic_data";
import {defaultMeetingSeriesInitialValues} from "./meeting_series_create";

export interface MeetingSeriesCreateFormProps extends Pick<FormProps, "id" | "translationsFormNames"> {
  readonly startMeeting: MeetingWithExtraInfo;
  readonly initialValues?: Partial<MeetingSeriesFormType>;
  readonly onSuccess?: (firstMeeting: MeetingBasicData, otherMeetingIds: string[]) => void;
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
    const ids = (await meetingMutation.mutateAsync({id: props.startMeeting.id, request: params})).data.data.ids;
    // eslint-disable-next-line solid/reactivity
    return () => {
      if (props.showToast ?? true) {
        toastSuccess(t(`forms.${props.id}.success`));
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
    };
  }

  const initialValues = () =>
    ({
      ...defaultMeetingSeriesInitialValues(),
      ...props.initialValues,
      ...(props.startMeeting.interval ? {seriesInterval: props.startMeeting.interval} : {}),
    }) satisfies MeetingSeriesFormType;

  return (
    <MeetingSeriesForm
      id={props.id}
      translationsFormNames={props.translationsFormNames}
      startMeeting={props.startMeeting}
      initialValues={initialValues()}
      onSubmit={createMeetings}
      onCancel={props.onCancel}
    />
  );
};

// For lazy loading
export default MeetingSeriesCreateForm;
