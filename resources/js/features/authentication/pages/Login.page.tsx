import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {MemoLoader} from "components/ui";
import {Page} from "components/utils";
import {User} from "data-access/memo-api";
import {Match, Switch, VoidComponent, createEffect} from "solid-js";
import {LoginForm} from "../forms/login";

/**
 * The login page.
 *
 * Possibly a temporary solution. The login modal can be displayed on top of any page, but it is
 * currently displayed as a separate page that triggers the modal on query error and redirects
 * otherwise.
 */
const LoginPage: VoidComponent = () => {
  const statusQuery = createQuery(() => ({
    ...User.statusQueryOptions,
    meta: {quietError: true},
  }));

  createEffect(() => {
    LoginForm.showModal(statusQuery.isError);
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
          <Navigate href="/" state={{fromLoginPage: true}} />
        </Match>
      </Switch>
    </Page>
  );
};

export default LoginPage;
