import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {useAllAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Api} from "data-access/memo-api/types";

const AttributeReorderForm = lazyAutoPreload(() => import("features/technicals/AttributeReorderForm"));

interface FormParams {
  /** The attribute determining the reordered set (all the attributes of its model). */
  readonly attributeId: Api.Id;
  readonly facilityMode: boolean;
}

export const createAttributeReorderModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  const allAttributes = useAllAttributes();
  // A reorder mixing facilities shows the facility names next to the attributes, so it needs
  // more room. The set mixes whenever the launching attribute is facility-owned.
  const mixesFacilities = () => {
    const params = args.params();
    return !!params && !!allAttributes()?.byId.get(params.attributeId)?.resource.facilityId;
  };
  return (
    <Modal
      title={t("forms.attribute_reorder.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={mixesFacilities() ? MODAL_STYLE_PRESETS.medium : MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <AttributeReorderForm
          attributeId={params().attributeId}
          facilityMode={params().facilityMode}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
