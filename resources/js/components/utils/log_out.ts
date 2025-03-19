import {useNavigate} from "@solidjs/router";
import {createMutation} from "@tanstack/solid-query";
import {resetDEV} from "components/utils/dev_mode";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {setProbablyLoggedIn} from "state/probablyLoggedIn.state";

export function useLogOut() {
  const navigate = useNavigate();
  const invalidate = useInvalidator();
  const mutation = createMutation(() => ({
    mutationFn: () => User.logout(),
    meta: {
      isFormSubmit: true,
    },
    onSuccess() {
      navigate("/");
      setTimeout(() => {
        resetDEV();
        setActiveFacilityId(undefined);
        // Invalidate as the last operation to avoid starting unnecessary queries that are later cancelled.
        invalidate.userStatusAndFacilityPermissions({clearCache: true});
      });
    },
  }));
  return {
    mutation,
    logOut() {
      setProbablyLoggedIn(false);
      mutation.mutate();
    },
  };
}
