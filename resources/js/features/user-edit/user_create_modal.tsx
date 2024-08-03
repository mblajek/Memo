import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";

const UserCreateForm = lazyAutoPreload(() => import("features/user-edit/UserCreateForm"));

export const createUserCreateModal = registerGlobalPageElement<true>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.user_create.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      <UserCreateForm onSuccess={args.clearParams} onCancel={args.clearParams} />
    </Modal>
  );
});
