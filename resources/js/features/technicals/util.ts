import {useQuery} from "@tanstack/solid-query";
import {createPersistence} from "components/persistence/persistence";
import {sessionStorageStorage} from "components/persistence/storage";
import {MutationMeta} from "components/utils/InitializeTanstackQuery";
import {Attribute, Attributes} from "data-access/memo-api/attributes";
import {Dictionary, Position} from "data-access/memo-api/dictionaries";
import {System} from "data-access/memo-api/groups/System";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {Api} from "data-access/memo-api/types";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {createSignal, Signal} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

type AdvancedViewPersistentState = {
  readonly advancedView: boolean;
};

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
    value: () => ({advancedView: advancedView()}),
    onLoad: (state) => setAdvancedView(state.advancedView),
    storage: sessionStorageStorage("technicals.advancedView"),
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
const SYSTEM_ORDER_OFFSET = 1_000_000;

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
 * The same-model attributes ordered together in the given facility scope: the global rows
 * plus the scope facility's rows (only the global rows when no scope facility is given).
 * Without the system rows, sorted by order.
 */
export function reorderableAttributes(
  attributes: Attributes | undefined,
  {model, scopeFacilityId}: {model: string; scopeFacilityId: string | undefined},
): Attribute[] {
  return (attributes?.getForModel(model) || [])
    .filter(
      (attribute) =>
        attribute.resource.defaultOrder < SYSTEM_ORDER_OFFSET &&
        facilityIdMatches(attribute.resource.facilityId, scopeFacilityId),
    )
    .toSorted((a, b) => a.resource.defaultOrder - b.resource.defaultOrder);
}

interface OrderableItem {
  readonly id: string;
  readonly resource: {readonly defaultOrder: number};
}

/**
 * The id of the item directly following the given one, i.e. the "insert before" anchor
 * describing the item's current place. Undefined for the last (or an unknown) item.
 */
export function itemAfter(items: readonly OrderableItem[], itemId: string): string | undefined {
  const index = items.findIndex((item) => item.id === itemId);
  return index >= 0 ? items[index + 1]?.id : undefined;
}

/**
 * The defaultOrder placing an existing item directly before the anchor item, or at the end of
 * the list when no anchor is given. Undefined when the item would not move relative to the
 * listed items (the anchor is already the item's direct successor).
 */
export function orderForMoveBefore(
  items: readonly OrderableItem[],
  {itemId, anchorId}: {itemId: string; anchorId: string},
): number | undefined {
  if (anchorId === itemAfter(items, itemId)) {
    return undefined;
  }
  const current = items.find((item) => item.id === itemId)?.resource.defaultOrder;
  if (current === undefined) {
    return undefined;
  }
  const anchor = anchorId ? items.find((item) => item.id === anchorId) : items.at(-1);
  if (!anchor) {
    return undefined;
  }
  const anchorOrder = anchor.resource.defaultOrder;
  // Moving down vacates the item's slot, shifting the in-between rows (the anchor included
  // when moving to the end) one up.
  const target = anchorOrder > current ? (anchorId ? anchorOrder - 1 : anchorOrder) : anchorOrder;
  return target === current ? undefined : target;
}

/**
 * Whether the position itself can be moved. In the facility variant only the facility's own
 * (non-global) rows are movable.
 */
export function isPositionMovable(position: Position, {facilityMode}: {facilityMode: boolean}): boolean {
  return !position.resource.isFixed && (!facilityMode || position.resource.facilityId !== null);
}

/**
 * Whether an ordered set of the dictionary's positions in the given scope can mix rows of
 * different facilities. The rows are then told apart by their facility names.
 */
export function positionReorderMixesFacilities(
  dictionary: Dictionary | undefined,
  {globalOnly}: {globalOnly: boolean},
): boolean {
  return !globalOnly && !dictionary?.resource.facilityId;
}

/** Returns a lookup of facility names by id, for displaying the facilities of listed items. */
export function useFacilityName() {
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  return (facilityId: string | null | undefined) =>
    facilityId ? facilitiesQuery.data?.find((facility) => facility.id === facilityId)?.name : undefined;
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
