import {createSignal} from "solid-js";

/** The facility selected in the page header, or undefined when not set. */
export const [activeFacilityId, setActiveFacilityId] = createSignal<string>();
