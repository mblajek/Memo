import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";

const PositionEditForm = lazyAutoPreload(() => import("features/technicals/PositionEditForm"));

interface FormParams {
  readonly positionId: string;
  readonly facilityMode: boolean;
}

export const createPositionEditModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.position_edit.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <PositionEditForm
          id={params().positionId}
          facilityMode={params().facilityMode}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
