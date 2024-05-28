import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {WorkTimeCreateFormProps} from "features/meeting/WorkTimeCreateForm";

const WorkTimeCreateForm = lazyAutoPreload(() => import("features/meeting/WorkTimeCreateForm"));

export const createWorkTimeCreateModal = registerGlobalPageElement<WorkTimeCreateFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.work_time_create.formName")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <WorkTimeCreateForm
          {...params()}
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
