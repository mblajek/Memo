import {MutationMeta} from "components/utils/InitializeTanstackQuery";
import {Dictionary, Position} from "data-access/memo-api/dictionaries";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {Api} from "data-access/memo-api/types";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {activeFacilityId} from "state/activeFacilityId.state";

/**
 * The meta for mutations run outside of any form, e.g. deletes. With no form to present the
 * field validation errors on, the specific errors are toasted instead of the generic
 * validation message.
 */
export const NON_FORM_MUTATION_META = {
  getErrorsToShow: (errorsToShow) => {
    const validationErrors = errorsToShow.filter(Api.isValidationError);
    return validationErrors.length ? validationErrors : errorsToShow;
  },
} satisfies MutationMeta;

/** Orders at or above this offset belong to system rows, kept out of the managed order sequence. */
export const SYSTEM_ORDER_OFFSET = 1_000_000;

/**
 * The dictionary's positions reorderable in the given facility scope: the global rows plus
 * the scope facility's rows, or the rows of all the facilities when no scope facility is
 * given. Without the system rows, sorted by order.
 */
export function reorderablePositions(
  dictionary: Dictionary,
  {scopeFacilityId}: {scopeFacilityId: string | undefined},
): Position[] {
  return dictionary.allPositions
    .filter(
      (position) =>
        position.resource.defaultOrder < SYSTEM_ORDER_OFFSET &&
        (scopeFacilityId === undefined || facilityIdMatches(position.resource.facilityId, scopeFacilityId)),
    )
    .toSorted((a, b) => a.resource.defaultOrder - b.resource.defaultOrder);
}

/**
 * Whether the position itself can be moved. In the facility variant only the facility's own
 * (non-global) rows are movable.
 */
export function isPositionMovable(position: Position, {facilityMode}: {facilityMode: boolean}): boolean {
  return !position.resource.isFixed && (!facilityMode || position.resource.facilityId !== null);
}

/** Whether any of the dictionary's positions in the given scope can be moved. */
export function anyPositionMovable(
  dictionary: Dictionary | undefined,
  {scopeFacilityId, facilityMode}: {scopeFacilityId: string | undefined; facilityMode: boolean},
): boolean {
  return (
    !!dictionary &&
    reorderablePositions(dictionary, {scopeFacilityId}).some((position) => isPositionMovable(position, {facilityMode}))
  );
}

/** The intrinsic filter of the facility-scoped tables: the global rows plus the active facility's rows. */
export function facilityScopeFilter(): FilterH {
  const nullFilter: FilterH = {type: "column", column: "facility.id", op: "null"};
  const facilityId = activeFacilityId();
  // The active facility signal can lag briefly behind the route; limit to the global rows until it resolves.
  return facilityId
    ? {type: "op", op: "|", val: [nullFilter, {type: "column", column: "facility.id", op: "=", val: facilityId}]}
    : nullFilter;
}
