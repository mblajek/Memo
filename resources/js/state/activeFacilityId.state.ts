import {createQuery} from "@tanstack/solid-query";
import {Accessor, createSignal} from "solid-js";
import {FacilityResource, System} from "../data-access/memo-api";

/** The facility selected in the page header, or undefined when not set. */
export const [activeFacilityId, setActiveFacilityId] = createSignal<string>();

export function useActiveFacility(): Accessor<FacilityResource | undefined> {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  // eslint-disable-next-line solid/reactivity
  return () => (activeFacilityId() ? facilitiesQuery.data?.find(({id}) => id === activeFacilityId()) : undefined);
}
