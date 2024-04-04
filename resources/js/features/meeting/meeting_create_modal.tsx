import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {MeetingCreateFormProps} from "features/meeting/MeetingCreateForm";

const MeetingCreateForm = lazyAutoPreload(() => import("features/meeting/MeetingCreateForm"));

export const createMeetingCreateModal = registerGlobalPageElement<MeetingCreateFormProps>((args) => {
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
          {...params()}
          onSuccess={(meeting) => {
            params().onSuccess?.(meeting);
            args.clearParams();
          }}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
