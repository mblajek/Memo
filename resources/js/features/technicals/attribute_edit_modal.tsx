import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {Api} from "data-access/memo-api/types";

const AttributeEditForm = lazyAutoPreload(() => import("features/technicals/AttributeEditForm"));

interface FormParams {
  readonly attributeId: Api.Id;
  readonly facilityMode: boolean;
}

export const createAttributeEditModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.attribute_edit.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.medium}
    >
      {(params) => (
        <AttributeEditForm
          id={params().attributeId}
          facilityMode={params().facilityMode}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
