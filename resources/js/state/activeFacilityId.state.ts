import {createQuery} from "@tanstack/solid-query";
import {System} from "data-access/memo-api/groups";
import {FacilityResource} from "data-access/memo-api/resources/facility.resource";
import {Accessor, createMemo, createSignal} from "solid-js";

/** The facility id value for outside of any facility context. */
export const NO_FACILITY = undefined;

/** A facility id, or `NO_FACILITY` (undefined) for global context. */
export type FacilityIdOrGlobal = string | typeof NO_FACILITY;

/** The facility selected in the page header, or undefined when not set. */
export const [activeFacilityId, setActiveFacilityId] = createSignal<FacilityIdOrGlobal>();

export function useActiveFacility(): Accessor<FacilityResource | undefined> {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const activeFacility = createMemo(() => facilitiesQuery.data?.find(({id}) => id === activeFacilityId()));
  return activeFacility;
}
