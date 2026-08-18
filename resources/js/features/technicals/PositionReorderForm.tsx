import {useMutation, useQuery} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {Position} from "data-access/memo-api/dictionaries";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {System} from "data-access/memo-api/groups/System";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {OrderEditForm} from "./OrderEditForm";
import {reorderMoves} from "./reorder";
import {NON_FORM_MUTATION_META, isPositionMovable, positionReorderMixesFacilities, reorderablePositions} from "./util";
import {cx} from "resources/js/components/utils/classnames";

interface Props {
  /** The dictionary whose positions are reordered. */
  readonly dictionaryId: string;
  /** Whether to patch via the facility endpoints (only the facility's own rows are movable then). */
  readonly facilityMode: boolean;
  /**
   * The facility scope of the reordered set in the global admin variant: the given facility's
   * rows (plus the global ones). Without it the set spans all the facilities. Ignored in the
   * facility variant, which is always scoped to the active facility.
   */
  readonly scopeFacilityId?: string;
  /** Limits the reordered set to the global rows. Only in the global admin variant. */
  readonly globalOnly?: boolean;
  /** The position initially scrolled to and highlighted. */
  readonly highlightPositionId?: string;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const PositionReorderForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allDictionaries = useAllDictionaries();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const dictionary = () => allDictionaries()?.get(props.dictionaryId);
  // In the facility variant the positions are scoped to the active facility; the global admin
  // variant is scoped to the requested facility, or spans all the facilities (even though the
  // cross-facility relative order is not visible in any facility's view).
  const scopeFacilityId = () => (props.facilityMode ? activeFacilityId() : props.scopeFacilityId);
  const globalOnly = () => !props.facilityMode && !!props.globalOnly;
  // Movability follows the endpoint, regardless of the displayed scope: the facility endpoint
  // can only move the facility's own rows, the admin endpoint any non-fixed row.
  const movable = (position: Position) => isPositionMovable(position, {facilityMode: props.facilityMode});
  const facilityName = (facilityId: string | null | undefined) =>
    facilityId ? facilitiesQuery.data?.find((facility) => facility.id === facilityId)?.name : undefined;
  const positions = () => {
    const dict = dictionary();
    return dict && reorderablePositions(dict, {scopeFacilityId: scopeFacilityId(), globalOnly: globalOnly()});
  };
  const reorderMutation = useMutation(() => ({
    mutationFn: async (finalIds: readonly string[]) => {
      const moves = reorderMoves(
        positions()!.map((position) => ({
          id: position.id,
          order: position.resource.defaultOrder,
          movable: movable(position),
        })),
        finalIds,
      );
      // The moves must run in order, each accounting for the shifts made by the previous ones.
      for (const move of moves) {
        await (props.facilityMode ? FacilityAdmin.updatePosition : Admin.updatePosition)({
          id: move.id,
          defaultOrder: move.order,
        });
      }
    },
    meta: NON_FORM_MUTATION_META,
  }));
  async function confirm(finalIds: readonly string[]) {
    try {
      await reorderMutation.mutateAsync(finalIds);
    } finally {
      // Also on failure: some of the moves might have been applied.
      invalidate.dictionaries();
    }
    toastSuccess(t("forms.position_reorder.success"));
    props.onSuccess?.();
  }
  return (
    <Show when={positions()}>
      {(positions) => (
        <OrderEditForm
          header={
            <div class="flex flex-col">
              <div>
                <span class="capitalize">{t("with_colon", {text: t("models.dictionary._name")})}</span>{" "}
                <b>{dictionary()?.name}</b>
              </div>
              <div>
                <Show
                  when={facilityName(scopeFacilityId())}
                  fallback={
                    <>
                      {globalOnly()
                        ? t("attributes.attribs_and_dicts.global_positions")
                        : t("attributes.attribs_and_dicts.all_facilities")}
                    </>
                  }
                >
                  {(facilityName) => (
                    <>
                      <span class="capitalize">{t("with_colon", {text: t("models.facility._name")})}</span>{" "}
                      <b>{facilityName()}</b>
                    </>
                  )}
                </Show>
              </div>
            </div>
          }
          items={positions().map((position) => ({
            id: position.id,
            label: (
              <div class={cx(position.resource.isDisabled ? "text-grey-text" : undefined)}>
                {position.label}
                <Show when={position.resource.isDisabled}>
                  {" "}
                  {t("parenthesised", {text: t("models.position.isDisabled")})}
                </Show>
              </div>
            ),
            details: positionReorderMixesFacilities(dictionary(), {
              facilityMode: props.facilityMode,
              globalOnly: globalOnly(),
            })
              ? facilityName(position.resource.facilityId)
              : undefined,
            movable: movable(position),
          }))}
          highlightId={props.highlightPositionId}
          onConfirm={confirm}
          onCancel={props.onCancel}
        />
      )}
    </Show>
  );
};

// For lazy loading
export default PositionReorderForm;
