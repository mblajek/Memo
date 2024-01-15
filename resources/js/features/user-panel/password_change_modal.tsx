import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {PasswordChangeForm} from "./PasswordChange.form";

export const createPasswordChangeModal = registerGlobalPageElement<true>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.password_change.formName")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      <PasswordChangeForm onSuccess={args.clearParams} onCancel={args.clearParams} />
    </Modal>
  );
});
