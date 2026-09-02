import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {Api} from "data-access/memo-api/types";

const DictionaryEditForm = lazyAutoPreload(() => import("features/technicals/DictionaryEditForm"));

interface FormParams {
  readonly dictionaryId: Api.Id;
  readonly facilityMode: boolean;
}

export const createDictionaryEditModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.dictionary_edit.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <DictionaryEditForm
          id={params().dictionaryId}
          facilityMode={params().facilityMode}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
