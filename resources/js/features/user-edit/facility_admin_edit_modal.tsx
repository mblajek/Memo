import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {Api} from "data-access/memo-api/types";

const FacilityAdminEditForm = lazyAutoPreload(() => import("features/user-edit/FacilityAdminEditForm"));

interface FormParams {
  readonly userId: Api.Id;
}

export const createFacilityAdminEditModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.facility_admin_edit.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <FacilityAdminEditForm userId={params().userId} onSuccess={args.clearParams} onCancel={args.clearParams} />
      )}
    </Modal>
  );
});
