import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {VoidComponent, createSignal, lazy} from "solid-js";

const UserCreateForm = lazy(() => import("features/user-edit/UserCreateForm"));

const [modalOpen, setModalOpen] = createSignal(false);

/**
 * The modal with the user edit form, initially hidden. To actually display the modal, call showModalFor
 * with the user id.
 *
 * This modal can be included in any page and it will show on top of whatever content was displayed
 * when showModal is called.
 */
export const UserCreateModal: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.user_create.formName")}
      open={modalOpen()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => setModalOpen(false)}
      style={MODAL_STYLE_PRESETS.medium}
    >
      <UserCreateForm onSuccess={() => setModalOpen(false)} onCancel={() => setModalOpen(false)} />
    </Modal>
  );
};

export function showUserCreateModal() {
  setModalOpen(true);
}
