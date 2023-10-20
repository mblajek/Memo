import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {MemoLoader} from "components/ui/MemoLoader";
import {Page, QueryBarrier} from "components/utils";
import {User} from "data-access/memo-api/groups";
import {VoidComponent, createEffect, onMount} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {LoginForm} from "../forms/login/Login.form";

/**
 * The login page.
 *
 * Possibly a temporary solution. The login modal can be displayed on top of any page, but it is
 * currently displayed as a separate page that triggers the modal on query error and redirects
 * otherwise.
 */
const LoginPage: VoidComponent = () => {
  const statusQuery = createQuery(User.statusQueryOptions);

  createEffect(() => {
    if (statusQuery.isSuccess) {
      if (statusQuery.data.user.lastLoginFacilityId) setActiveFacilityId(statusQuery.data.user.lastLoginFacilityId);
    }
  });

  createEffect(() => {
    LoginForm.showModal(statusQuery.isError);
  });

  onMount(() => {
    setActiveFacilityId(undefined);
  });

  return (
    <Page title="Logowanie">
      <LoginForm.LoginModal />
      <QueryBarrier
        queries={[statusQuery]}
        Error={
          // Do not show any errors, instead just show this login form.
          () => undefined
        }
        Pending={MemoLoader}
      >
        <Navigate href="/help" state={{fromLoginPage: true}} />
      </QueryBarrier>
    </Page>
  );
};

export default LoginPage;
