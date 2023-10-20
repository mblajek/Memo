import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {VoidComponent, createSignal, lazy} from "solid-js";

const FacilityCreateForm = lazy(() => import("features/facility-edit/FacilityCreateForm"));

const [modalOpen, setModalOpen] = createSignal(false);

export const FacilityCreateModal: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.facility_create.formName")}
      open={modalOpen()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => setModalOpen(false)}
      style={MODAL_STYLE_PRESETS.medium}
    >
      <FacilityCreateForm onSuccess={() => setModalOpen(false)} onCancel={() => setModalOpen(false)} />
    </Modal>
  );
};

export function showFacilityCreateModal() {
  setModalOpen(true);
}
