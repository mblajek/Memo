import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {useLogOut} from "components/utils/log_out";
import {doAndClearParams} from "components/utils/modals";
import {PasswordChangeForm, PasswordChangeFormProps} from "./PasswordChange.form";

export const createPasswordChangeModal = registerGlobalPageElement<PasswordChangeFormProps>((args) => {
  const t = useLangFunc();
  const logOut = useLogOut();
  return (
    <Modal
      title={t("forms.password_change.form_name")}
      open={args.params()}
      closeOn={args.params()?.forceChange ? [] : ["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <PasswordChangeForm
          expirationSoon={params().expirationSoon}
          forceChange={params().forceChange}
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onCancel={doAndClearParams(args, () => {
            params().onCancel?.();
            if (params().forceChange) {
              logOut.logOut();
            }
          })}
        />
      )}
    </Modal>
  );
});
