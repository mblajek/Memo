import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {Api} from "data-access/memo-api/types";
import {VoidComponent, createSignal, lazy} from "solid-js";

const FacilityEditForm = lazy(() => import("features/facility-edit/FacilityEditForm"));

interface FormParams {
  readonly facilityId: Api.Id;
}

const [modalParams, setModalParams] = createSignal<FormParams>();

export const FacilityEditModal: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.facility_edit.formName")}
      open={modalParams()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => setModalParams(undefined)}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <FacilityEditForm
          id={params().facilityId}
          onSuccess={() => setModalParams(undefined)}
          onCancel={() => setModalParams(undefined)}
        />
      )}
    </Modal>
  );
};

export function showFacilityEditModal(params: FormParams) {
  setModalParams(params);
}
