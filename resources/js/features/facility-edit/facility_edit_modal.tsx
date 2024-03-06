import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {Api} from "data-access/memo-api/types";
import {lazy} from "solid-js";

const FacilityEditForm = lazy(() => import("features/facility-edit/FacilityEditForm"));

interface FormParams {
  readonly facilityId: Api.Id;
}

export const createFacilityEditModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.facility_edit.formName")}
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
