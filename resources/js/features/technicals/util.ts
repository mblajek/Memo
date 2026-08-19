import {createPersistence} from "components/persistence/persistence";
import {sessionStorageStorage} from "components/persistence/storage";
import {MutationMeta} from "components/utils/InitializeTanstackQuery";
import {Dictionary, Position} from "data-access/memo-api/dictionaries";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {Api} from "data-access/memo-api/types";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {createSignal, Signal} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

interface AdvancedViewPersistentState {
  readonly advancedView: boolean;
}

/**
 * The state of the advanced view switch, shared by the forms and remembered for the session,
 * so that it does not need to be set again on every form.
 *
 * This is the state of the switch itself, not the effective advanced view, so that the forms
 * displaying the advanced view unconditionally (and thus having no switch) leave it alone.
 */
export function createAdvancedViewSignal(): Signal<boolean> {
  const [advancedView, setAdvancedView] = createSignal(false);
  createPersistence<AdvancedViewPersistentState>({
    storage: sessionStorageStorage("technicals.advancedView"),
    value: () => ({advancedView: advancedView()}),
    onLoad: (state) => setAdvancedView(state.advancedView),
  });
  return [advancedView, setAdvancedView];
}

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
 * given; only the global rows in the globalOnly variant. Without the system rows, sorted
 * by order.
 */
export function reorderablePositions(
  dictionary: Dictionary,
  {scopeFacilityId, globalOnly}: {scopeFacilityId: string | undefined; globalOnly?: boolean},
): Position[] {
  return dictionary.allPositions
    .filter(
      (position) =>
        position.resource.defaultOrder < SYSTEM_ORDER_OFFSET &&
        (globalOnly
          ? position.resource.facilityId === null
          : scopeFacilityId === undefined || facilityIdMatches(position.resource.facilityId, scopeFacilityId)),
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

/**
 * Whether a reorder of the dictionary's positions in the given scope can mix rows of
 * different facilities. The rows are then told apart by their facility names.
 */
export function positionReorderMixesFacilities(
  dictionary: Dictionary | undefined,
  {facilityMode, globalOnly}: {facilityMode: boolean; globalOnly: boolean},
): boolean {
  return !facilityMode && !globalOnly && !dictionary?.resource.facilityId;
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
