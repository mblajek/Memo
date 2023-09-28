import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {MemoLoader} from "components/ui";
import {Page, QueryBarrier} from "components/utils";
import {User} from "data-access/memo-api";
import {Component, createEffect, onMount} from "solid-js";
import {setActiveFacilityId} from "state/activeFacilityId.state";
import {LoginForm} from "../forms/login";

/**
 * The login page.
 *
 * Possibly a temporary solution. The login modal can be displayed on top of any page, but it is
 * currently displayed as a separate page that triggers the modal on query error and redirects
 * otherwise.
 */
const LoginPage: Component = () => {
  const statusQuery = createQuery(() => ({
    ...User.statusQueryOptions(),
    meta: {quietError: true},
  }));

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
      <LoginForm.Modal />
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
