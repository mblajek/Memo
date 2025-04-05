import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {User} from "data-access/memo-api/groups/User";
import {Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

export default (() => {
  const status = createQuery(User.statusQueryOptions);
  const activeFacility = useActiveFacility();
  // TODO: Implement. This page could show facility contact info and basic stats.
  return (
    <Show when={(activeFacility() && status.data?.permissions.facilityAdmin) || status.data?.permissions.facilityStaff}>
      <Navigate href={`/${activeFacility()!.url}/calendar`} />
    </Show>
  );
}) satisfies VoidComponent;
