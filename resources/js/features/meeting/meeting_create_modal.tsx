import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {InitialDataParams} from "features/meeting/MeetingCreateForm";
import {lazy} from "solid-js";

const MeetingCreateForm = lazy(() => import("features/meeting/MeetingCreateForm"));

interface FormParams {
  readonly initialData?: InitialDataParams;
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
          initialData={params().initialData}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
