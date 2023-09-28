import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {MemoLoader} from "components/ui";
import {Page} from "components/utils";
import {User} from "data-access/memo-api";
import {Component, Match, Switch, createEffect, onMount} from "solid-js";
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
      <Switch>
        <Match when={statusQuery.isPending}>
          <div class="w-full h-screen flex justify-center items-center">
            <MemoLoader size={300} />
          </div>
        </Match>
        <Match when={statusQuery.isSuccess}>
          <Navigate href="/help" state={{fromLoginPage: true}} />
        </Match>
      </Switch>
    </Page>
  );
};

export default LoginPage;
