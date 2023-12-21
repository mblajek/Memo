import {createMutation} from "@tanstack/solid-query";
import {BigSpinner} from "components/ui/Spinner";
import {useLangFunc} from "components/utils";
import {useAttributes} from "data-access/memo-api/attributes";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";
import toast from "solid-toast";
import {MeetingForm, MeetingFormType, transformFormValues} from "./MeetingForm";
import {meetingTimeInitialValues} from "./meeting_time_controller";

interface Props {
  readonly initialData?: InitialDataParams;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export interface InitialDataParams {
  readonly start?: DateTime;
  readonly staff?: readonly string[];
}

export const MeetingCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const dictionaries = useDictionaries();
  const invalidate = FacilityMeeting.useInvalidator();
  const meetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.createMeeting,
    meta: {isFormSubmit: true},
  }));

  async function createMeeting(values: MeetingFormType) {
    await meetingMutation.mutateAsync({
      ...transformFormValues(values),
    });
    toast.success(t("forms.meeting_create.success"));
    props.onSuccess?.();
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.meetings();
  }

  const initialValues = () =>
    ({
      ...meetingTimeInitialValues(props.initialData?.start),
      typeDictId: "",
      statusDictId: dictionaries()?.get("meetingStatus").get("planned").id || "",
      isRemote: false,
      staff: props.initialData?.staff?.map((userId) => ({userId, attendanceStatusDictId: ""})) || [],
      clients: [],
      notes: "",
      resources: [],
    }) satisfies MeetingFormType;

  return (
    <Show when={attributes() && dictionaries()} fallback={<BigSpinner />}>
      <MeetingForm
        id="meeting_create"
        initialValues={initialValues()}
        onSubmit={createMeeting}
        onCancel={props.onCancel}
      />
    </Show>
  );
};

// For lazy loading
export default MeetingCreateForm;
