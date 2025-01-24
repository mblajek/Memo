import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils/lang";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {Api} from "data-access/memo-api/types";

const FacilityEditForm = lazyAutoPreload(() => import("features/facility-edit/FacilityEditForm"));

interface FormParams {
  readonly facilityId: Api.Id;
}

export const createFacilityEditModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.facility_edit.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <FacilityEditForm id={params().facilityId} onSuccess={args.clearParams} onCancel={args.clearParams} />
      )}
    </Modal>
  );
});
