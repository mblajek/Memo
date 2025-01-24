import {Modal, MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {useLangFunc} from "components/utils/lang";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {ClientDeleteFormProps} from "features/client/ClientDeleteForm";

const ClientDeleteForm = lazyAutoPreload(() => import("features/client/ClientDeleteForm"));

export const createClientDeleteModal = registerGlobalPageElement<ClientDeleteFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.client_delete.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <ClientDeleteForm
          {...params()}
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
