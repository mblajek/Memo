import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {Api} from "data-access/memo-api/types";

const PositionReorderForm = lazyAutoPreload(() => import("features/technicals/PositionReorderForm"));

interface FormParams {
  /** The dictionary whose positions are reordered. */
  readonly dictionaryId: Api.Id;
  readonly facilityMode: boolean;
  /** The facility scope of the set in the global admin variant (all the facilities when absent). */
  readonly scopeFacilityId?: Api.Id;
  /** The position initially scrolled to and highlighted. */
  readonly highlightPositionId?: Api.Id;
}

export const createPositionReorderModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={t("forms.position_reorder.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <PositionReorderForm
          dictionaryId={params().dictionaryId}
          facilityMode={params().facilityMode}
          scopeFacilityId={params().scopeFacilityId}
          highlightPositionId={params().highlightPositionId}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
