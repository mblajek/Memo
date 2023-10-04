import {useLangFunc} from "components/utils";
import {VoidComponent, createSignal, lazy} from "solid-js";
import {Modal as ModalComponent, MODAL_STYLE_PRESETS} from "components/ui";

const FacilityCreateForm = lazy(() => import("features/facility-edit/FacilityCreate.form"));

export namespace FacilityCreateModal {
  const [modalOpen, setModalOpen] = createSignal(false);

  export const Modal: VoidComponent = () => {
    const t = useLangFunc();
    return (
      <ModalComponent
        title={t("forms.facility_create.formName")}
        open={modalOpen()}
        closeOn={["escapeKey", "closeButton"]}
        onClose={() => setModalOpen(false)}
        style={MODAL_STYLE_PRESETS.medium}
      >
        <FacilityCreateForm onSuccess={() => setModalOpen(false)} onCancel={() => setModalOpen(false)} />
      </ModalComponent>
    );
  };

  export function show() {
    setModalOpen(true);
  }
}
