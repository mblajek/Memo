import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {doAndClearParams} from "components/utils/modals";
import {AddToClientGroupFormProps} from "features/client/AddToClientGroupForm";

const AddToClientGroupForm = lazyAutoPreload(() => import("features/client/AddToClientGroupForm"));

export const createAddToClientGroupModal = registerGlobalPageElement<AddToClientGroupFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.add_to_client_group.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <AddToClientGroupForm
          {...params()}
          onSuccess={doAndClearParams(args, params().onSuccess)}
          onCancel={doAndClearParams(args, params().onCancel)}
        />
      )}
    </Modal>
  );
});
