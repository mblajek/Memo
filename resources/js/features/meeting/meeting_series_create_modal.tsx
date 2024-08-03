import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {MeetingSeriesCreateFormProps} from "features/meeting/MeetingSeriesCreateForm";
import {doAndClearParams} from "components/utils/modals";

const MeetingSeriesCreateForm = lazyAutoPreload(() => import("features/meeting/MeetingSeriesCreateForm"));

export const createMeetingSeriesCreateModal = registerGlobalPageElement<MeetingSeriesCreateFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={args.params() ? t(`forms.${args.params()?.id}.form_name`) : undefined}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <MeetingSeriesCreateForm
          {...params()}
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onCancel={doAndClearParams(args, params().onCancel)}
        />
      )}
    </Modal>
  );
});
