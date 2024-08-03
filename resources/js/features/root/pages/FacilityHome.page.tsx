import {useNavigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {User} from "data-access/memo-api/groups";
import NotYetImplemented from "features/not-found/components/NotYetImplemented";
import {VoidComponent, onMount} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

export default (() => {
  const status = createQuery(User.statusQueryOptions);
  const activeFacility = useActiveFacility();
  // TODO: Implement. This page could show facility contact info and basic stats.
  const navigate = useNavigate();
  onMount(() => {
    if (status.data?.permissions.facilityAdmin || status.data?.permissions.facilityStaff) {
      navigate(`/${activeFacility()?.url}/calendar`);
    }
  });
  return <NotYetImplemented />;
}) satisfies VoidComponent;
