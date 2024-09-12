import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {usePasswordExpiration} from "components/utils/password_expiration";
import {PasswordChangeForm} from "./PasswordChange.form";

export const createPasswordChangeModal = registerGlobalPageElement<true>((args) => {
  const t = useLangFunc();
  const expiration = usePasswordExpiration();
  return (
    <Modal
      title={t("forms.password_change.form_name")}
      open={args.params()}
      closeOn={expiration() === "expired" ? [] : ["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      <PasswordChangeForm
        expiration={expiration()}
        onSuccess={args.clearParams}
        onCancel={expiration() === "expired" ? undefined : args.clearParams}
      />
    </Modal>
  );
});
