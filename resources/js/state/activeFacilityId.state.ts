import {createQuery} from "@tanstack/solid-query";
import {System} from "data-access/memo-api/groups";
import {FacilityResource} from "data-access/memo-api/resources";
import {Accessor, createMemo, createSignal} from "solid-js";

/** The facility selected in the page header, or undefined when not set. */
export const [activeFacilityId, setActiveFacilityId] = createSignal<string>();

export function useActiveFacility(): Accessor<FacilityResource | undefined> {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const activeFacility = createMemo(() => facilitiesQuery.data?.find(({id}) => id === activeFacilityId()));
  return activeFacility;
}
