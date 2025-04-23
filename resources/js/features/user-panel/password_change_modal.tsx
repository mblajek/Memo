import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {PasswordChangeForm} from "./PasswordChange.form";

interface Params {
  readonly expirationSoon?: boolean;
  readonly forceChange?: boolean;
}

export const createPasswordChangeModal = registerGlobalPageElement<Params>((args) => {
  const t = useLangFunc();
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
          onSuccess={args.clearParams}
          onCancel={params().forceChange ? undefined : args.clearParams}
        />
      )}
    </Modal>
  );
});
