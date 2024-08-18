import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {ClientGroupEditFormProps} from "./ClientGroupEditForm";

const ClientGroupEditForm = lazyAutoPreload(() => import("features/client/ClientGroupEditForm"));

export const createClientGroupEditModal = registerGlobalPageElement<ClientGroupEditFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.client_group_edit.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <ClientGroupEditForm
          {...params()}
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onDeleted={doAndClearParams(args, params().onDeleted)}
          onCancel={doAndClearParams(args, params().onCancel)}
        />
      )}
    </Modal>
  );
});
