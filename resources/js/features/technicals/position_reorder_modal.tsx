import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {lazyAutoPreload} from "components/utils/lazy_auto_preload";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Api} from "data-access/memo-api/types";
import {positionReorderMixesFacilities} from "./util";

const PositionReorderForm = lazyAutoPreload(() => import("features/technicals/PositionReorderForm"));

interface FormParams {
  /** The dictionary whose positions are reordered. */
  readonly dictionaryId: Api.Id;
  readonly facilityMode: boolean;
  /** The facility scope of the set in the global admin variant (all the facilities when absent). */
  readonly scopeFacilityId?: Api.Id;
  /** Limits the set to the global rows in the global admin variant. */
  readonly globalOnly?: boolean;
  /** The position initially scrolled to and highlighted. */
  readonly highlightPositionId?: Api.Id;
}

export const createPositionReorderModal = registerGlobalPageElement<FormParams>((args) => {
  const t = useLangFunc();
  const allDictionaries = useAllDictionaries();
  // A reorder mixing facilities shows the facility names next to the positions, so it needs more room.
  const mixesFacilities = () => {
    const params = args.params();
    return (
      !!params &&
      positionReorderMixesFacilities(allDictionaries()?.byId.get(params.dictionaryId), {
        facilityMode: params.facilityMode,
        globalOnly: !!params.globalOnly,
      })
    );
  };
  return (
    <Modal
      title={t("forms.position_reorder.form_name")}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={args.clearParams}
      style={mixesFacilities() ? MODAL_STYLE_PRESETS.medium : MODAL_STYLE_PRESETS.narrow}
    >
      {(params) => (
        <PositionReorderForm
          dictionaryId={params().dictionaryId}
          facilityMode={params().facilityMode}
          scopeFacilityId={params().scopeFacilityId}
          globalOnly={params().globalOnly}
          highlightPositionId={params().highlightPositionId}
          onSuccess={args.clearParams}
          onCancel={args.clearParams}
        />
      )}
    </Modal>
  );
});
