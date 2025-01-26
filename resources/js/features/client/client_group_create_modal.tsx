import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils/lang";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {ClientGroupCreateFormProps} from "./ClientGroupCreateForm";

const ClientGroupCreateForm = lazyAutoPreload(() => import("features/client/ClientGroupCreateForm"));

export const createClientGroupCreateModal = registerGlobalPageElement<ClientGroupCreateFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.client_group_create.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <ClientGroupCreateForm
          {...params()}
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
