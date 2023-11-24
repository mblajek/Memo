import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {Api} from "data-access/memo-api/types";
import {VoidComponent, createSignal, lazy} from "solid-js";

const UserEditForm = lazy(() => import("features/user-edit/UserEditForm"));

interface FormParams {
  userId: Api.Id;
}

const [modalShownFor, setModalShownFor] = createSignal<FormParams>();

/**
 * The modal with the user edit form, initially hidden. To actually display the modal, call showModalFor
 * with the user id.
 *
 * This modal can be included in any page and it will show on top of whatever content was displayed
 * when showModal is called.
 */
export const UserEditModal: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.user_edit.formName")}
      open={modalShownFor()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => setModalShownFor(undefined)}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <UserEditForm
          userId={params().userId}
          onSuccess={() => setModalShownFor(undefined)}
          onCancel={() => setModalShownFor(undefined)}
        />
      )}
    </Modal>
  );
};

export function showUserEditModal(params: FormParams) {
  setModalShownFor(params);
}
