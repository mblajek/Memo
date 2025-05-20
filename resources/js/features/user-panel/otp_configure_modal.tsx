import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {doAndClearParams} from "components/utils/modals";
import {OTPConfigureForm, OTPConfigureFormProps} from "features/user-panel/OTPConfigure.form";

export const createOTPConfigureModal = registerGlobalPageElement<OTPConfigureFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.otp_configure.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <OTPConfigureForm
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onCancel={doAndClearParams(args, params().onCancel)}
        />
      )}
    </Modal>
  );
});
