import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazy} from "solid-js";
import {MeetingFormType} from "./MeetingForm";
import {MeetingChangeSuccessData} from "./meeting_change_success_data";

const MeetingCreateForm = lazy(() => import("features/meeting/MeetingCreateForm"));

interface FormParams {
  readonly initialValues?: Partial<MeetingFormType>;
  readonly onSuccess?: (meeting: MeetingChangeSuccessData) => void;
  /** Whether to show toast on success. Default: true. */
  readonly showToast?: boolean;
}

export const createMeetingCreateModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.meeting_create.formName")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <MeetingCreateForm
          initialValues={params().initialValues}
          onSuccess={(meeting) => {
            params().onSuccess?.(meeting);
            args.clearParams();
          }}
          onCancel={args.clearParams}
          showToast={params().showToast}
        />
      )}
    </Modal>
  );
});
