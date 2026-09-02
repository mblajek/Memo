import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";

const PositionCreateForm = lazyAutoPreload(() => import("features/technicals/PositionCreateForm"));

interface FormParams {
  readonly dictionaryId: string;
  readonly facilityMode: boolean;
}

export const createPositionCreateModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.position_create.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <PositionCreateForm
          dictionaryId={params().dictionaryId}
          facilityMode={params().facilityMode}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
