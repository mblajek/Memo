import {createQuery} from "@tanstack/solid-query";
import {Accessor, createMemo, createSignal} from "solid-js";
import {FacilityResource, System} from "../data-access/memo-api";

/** The facility selected in the page header, or undefined when not set. */
export const [activeFacilityId, setActiveFacilityId] = createSignal<string>();

export function useActiveFacility(): Accessor<FacilityResource | undefined> {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const activeFacility = createMemo(() => facilitiesQuery.data?.find(({id}) => id === activeFacilityId()));
  return activeFacility;
}
