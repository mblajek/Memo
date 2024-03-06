import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazy} from "solid-js";

const FacilityCreateForm = lazy(() => import("features/facility-edit/FacilityCreateForm"));

export const createFacilityCreateModal = registerGlobalPageElement<true>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.facility_create.formName")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      <FacilityCreateForm onSuccess={args.clearParams} onCancel={args.clearParams} />
    </Modal>
  );
});
