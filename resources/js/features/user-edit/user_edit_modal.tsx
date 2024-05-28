import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {Api} from "data-access/memo-api/types";

const UserEditForm = lazyAutoPreload(() => import("features/user-edit/UserEditForm"));

interface FormParams {
  readonly userId: Api.Id;
}

export const createUserEditModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.user_edit.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => <UserEditForm userId={params().userId} onSuccess={args.clearParams} onCancel={args.clearParams} />}
    </Modal>
  );
});
