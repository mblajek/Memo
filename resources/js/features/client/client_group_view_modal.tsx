import {Capitalize} from "components/ui/Capitalize";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {ClientGroupViewEditForm, ClientGroupViewEditFormProps} from "./ClientGroupViewEditForm";

export const createClientGroupViewModal = registerGlobalPageElement<ClientGroupViewEditFormProps>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={<Capitalize text={t("models.client_group._name")} />}
      open={args.params()}
      closeOn={["escapeKey", "closeButton", "clickOutside"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => <ClientGroupViewEditForm {...params()} />}
    </Modal>
  );
});
