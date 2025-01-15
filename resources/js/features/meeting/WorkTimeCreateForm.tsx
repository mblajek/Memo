import {BigSpinner} from "components/ui/Spinner";
import {useLangFunc} from "components/utils";
import {toastSuccess} from "components/utils/toast";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {MeetingResourceForCreate} from "data-access/memo-api/resources/meeting.resource";
import {RequiredNonNullable} from "data-access/memo-api/types";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";
import {useMeetingAPI} from "./meeting_api";
import {MeetingBasicData} from "./meeting_basic_data";
import {defaultMeetingSeriesInitialValues} from "./meeting_series_create";
import {getMeetingTimeFullData, meetingTimePartDayInitialValue} from "./meeting_time_controller";
import {getClearedSeriesValues, getMeetingSeriesCloneParams, MeetingSeriesFormType} from "./MeetingSeriesForm";
import {SUBTYPE_FACILITY_WIDE, WorkTimeFormSubtype} from "./work_time_form_subtype";
import {getUnusedMeetingFields, WorkTimeForm, WorkTimeFormType} from "./WorkTimeForm";
import {WorkTimeStaff} from "./WorkTimeStaff";

export interface WorkTimeCreateFormProps {
  readonly subtype: WorkTimeFormSubtype;
  readonly initialValues?: Partial<WorkTimeFormType>;
  readonly onSuccess?: (meeting: MeetingBasicData, cloneIds?: readonly string[]) => void;
  readonly onCancel?: () => void;
}

export const WorkTimeCreateForm: VoidComponent<WorkTimeCreateFormProps> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const {dictionaries, meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  const meetingAPI = useMeetingAPI();
  const invalidate = useInvalidator();

  function transformFormValues(values: WorkTimeFormType): MeetingResourceForCreate {
    return {
      ...values,
      ...getClearedSeriesValues(),
      ...getMeetingTimeFullData(values).timeValues,
      ...getUnusedMeetingFields(dictionaries()!),
      typeDictId: props.subtype.typeDictId,
      staff:
        props.subtype.staff === SUBTYPE_FACILITY_WIDE
          ? []
          : [{userId: props.subtype.staff.id, attendanceStatusDictId: attendanceStatusDict()!.ok.id}],
    };
  }

  async function createWorkTimes(values: WorkTimeFormType) {
    const meeting = transformFormValues(values);
    const {id, cloneIds} = await meetingAPI.create(
      meeting,
      values.createSeries
        ? getMeetingSeriesCloneParams({
            startDate: DateTime.fromISO(values.date),
            values: values as MeetingSeriesFormType,
          })
        : undefined,
    );
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(
        t(cloneIds?.length ? "forms.work_time_series_create.success" : `forms.${props.subtype.formId}.success`),
      );
      props.onSuccess?.({...(meeting as RequiredNonNullable<MeetingResourceForCreate>), id}, cloneIds);
      // Important: Invalidation should happen after calling onSuccess which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facility.meetings();
    };
  }

  const initialValues = () =>
    ({
      ...meetingTimePartDayInitialValue(),
      notes: "",
      createSeries: false,
      ...defaultMeetingSeriesInitialValues(),
      seriesInterval: "1d",
      ...props.initialValues,
    }) satisfies WorkTimeFormType;

  return (
    <Show when={attributes() && meetingStatusDict()} fallback={<BigSpinner />}>
      <div class="flex flex-col gap-1">
        <WorkTimeStaff staff={props.subtype.staff} />
        <WorkTimeForm
          id={props.subtype.formId}
          subtype={props.subtype}
          extraTranslationsFormNames={["meeting_create", "work_time_series_create"]}
          initialValues={initialValues()}
          forceTimeEditable
          viewMode={false}
          allowCreateSeries
          onSubmit={createWorkTimes}
          onCancel={props.onCancel}
        />
      </div>
    </Show>
  );
};

// For lazy loading
export default WorkTimeCreateForm;
