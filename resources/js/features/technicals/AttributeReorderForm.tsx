import {useMutation, useQuery} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {useAllAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {System} from "data-access/memo-api/groups/System";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {Show, VoidComponent} from "solid-js";
import {OrderEditForm} from "./OrderEditForm";
import {reorderMoves} from "./reorder";
import {NON_FORM_MUTATION_META, SYSTEM_ORDER_OFFSET} from "./util";

interface Props {
  /**
   * The attribute determining the reordered set: the attributes of its model, scoped to its
   * facility (or the global ones, for a global attribute).
   */
  readonly attributeId: string;
  /** Whether to patch via the facility endpoints (only the facility's own rows are movable then). */
  readonly facilityMode: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const AttributeReorderForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allAttributes = useAllAttributes();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const scopeAttribute = () => allAttributes()?.byId.get(props.attributeId);
  const scopeFacilityId = () => scopeAttribute()?.resource.facilityId || undefined;
  function facilityName(facilityId: string | undefined) {
    return facilityId ? facilitiesQuery.data?.find((facility) => facility.id === facilityId)?.name : undefined;
  }
  const scopeFacilityName = () => facilityName(scopeFacilityId());
  const attributes = () => {
    const attribute = scopeAttribute();
    if (!attribute) {
      return undefined;
    }
    return allAttributes()
      ?.getForModel(attribute.model)
      .filter(
        (other) =>
          other.resource.defaultOrder < SYSTEM_ORDER_OFFSET &&
          facilityIdMatches(other.resource.facilityId, scopeFacilityId()),
      )
      .toSorted((a, b) => a.resource.defaultOrder - b.resource.defaultOrder);
  };
  // The list holds only the global and the scope facility's attributes, so in facility mode
  // (where the scope is the active facility) the movable ones are simply the non-global ones.
  const isMovable = (attribute: {resource: {isFixed: boolean; facilityId: string | null}}) =>
    !attribute.resource.isFixed && (!props.facilityMode || attribute.resource.facilityId !== null);
  const reorderMutation = useMutation(() => ({
    mutationFn: async (finalIds: readonly string[]) => {
      const moves = reorderMoves(
        attributes()!.map((attribute) => ({
          id: attribute.id,
          order: attribute.resource.defaultOrder,
          movable: isMovable(attribute),
        })),
        finalIds,
      );
      for (const move of moves) {
        await (props.facilityMode ? FacilityAdmin.updateAttribute : Admin.updateAttribute)({
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
      invalidate.attributes();
    }
    toastSuccess(t("forms.attribute_reorder.success"));
    props.onSuccess?.();
  }
  return (
    <Show when={attributes()}>
      {(attributes) => (
        <OrderEditForm
          header={
            <div>
              <Show when={scopeFacilityName()} fallback={<>{t("attributes.attribs_and_dicts.global_attributes")}</>}>
                {(facilityName) => (
                  <>
                    <span class="capitalize">{t("with_colon", {text: t("models.facility._name")})}</span>{" "}
                    <b>{facilityName()}</b>
                  </>
                )}
              </Show>
            </div>
          }
          items={attributes().map((attribute) => ({
            id: attribute.id,
            label: (
              <>
                {attribute.label}
                <span class="text-grey-text">
                  {attribute.label ? ": " : ""}
                  {String(attribute.type)}
                </span>
              </>
            ),
            // In a facility-scoped set, tell the facility's rows apart from the global ones.
            details: facilityName(attribute.resource.facilityId || undefined),
            movable: isMovable(attribute),
          }))}
          highlightId={props.attributeId}
          onConfirm={confirm}
          onCancel={props.onCancel}
        />
      )}
    </Show>
  );
};

// For lazy loading
export default AttributeReorderForm;
