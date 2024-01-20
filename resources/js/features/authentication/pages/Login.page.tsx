import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {MemoLoader} from "components/ui/MemoLoader";
import {QueryBarrier} from "components/utils";
import {User} from "data-access/memo-api/groups";
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
  onMount(() => setActiveFacilityId(undefined));
  const loginModal = createLoginModal();
  createEffect(() => {
    if (statusQuery.isError && !loginModal.getValue()) {
      loginModal.show();
    }
  });
  return (
    <QueryBarrier
      queries={[statusQuery]}
      error={
        // Do not show any errors, instead just show this login form.
        () => undefined
      }
      pending={() => <MemoLoader />}
    >
      <Navigate href="/help" state={{fromLoginPage: true}} />
    </QueryBarrier>
  );
}) satisfies VoidComponent;
