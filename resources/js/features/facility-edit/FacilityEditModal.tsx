import {useLangFunc} from "components/utils";
import {VoidComponent, createSignal, lazy} from "solid-js";
import {Modal as ModalComponent, MODAL_STYLE_PRESETS} from "components/ui";
import {Api} from "data-access/memo-api/types";

const FacilityEditForm = lazy(() => import("features/facility-edit/FacilityEditForm"));

interface FormParams {
  facilityId: Api.Id;
}

const [modalParams, setModalParams] = createSignal<FormParams>();

export const FacilityEditModal: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <ModalComponent
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
    </ModalComponent>
  );
};

export function showFacilityEditModal(params: FormParams) {
  setModalParams(params);
}
