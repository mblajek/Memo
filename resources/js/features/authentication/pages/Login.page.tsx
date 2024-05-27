import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {QueryBarrier} from "components/utils";
import {User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {VoidComponent, createEffect, onMount} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {createLoginModal} from "../forms/login/login_modal";

/**
 * The login page.
 *
 * Possibly a temporary solution. The login modal can be displayed on top of any page, but it is
 * currently displayed as a separate page that triggers the modal on query error and redirects
 * otherwise.
 */
export default (() => {
  const statusQuery = createQuery(User.statusQueryOptions);
  const systemStatusMonitor = useSystemStatusMonitor();
  const invalidate = useInvalidator();
  onMount(() => setActiveFacilityId(undefined));
  const loginModal = createLoginModal();
  createEffect(() => {
    if (systemStatusMonitor.needsReload()) {
      // If on the login screen, just reload without asking.
      location.reload();
    }
    if (statusQuery.isError && !loginModal.isShown()) {
      loginModal.show();
    }
    if (statusQuery.isSuccess) {
      invalidate.everythingThrottled();
    }
  });
  return (
    <QueryBarrier
      queries={[statusQuery]}
      ignoreCachedData
      // Do not show any errors, instead just show this login form.
      error={() => undefined}
      pending={() => undefined}
    >
      <Navigate href="/help" />
    </QueryBarrier>
  );
}) satisfies VoidComponent;
