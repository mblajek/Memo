import {Navigate} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {MemoLoader} from "components/ui";
import {Page} from "components/utils";
import {User} from "data-access/memo-api";
import {Component, Match, Switch} from "solid-js";
import {LoginForm} from "../forms/login";

const LoginPage: Component = () => {
  const statusQuery = createQuery(() => ({
    ...User.statusQueryOptions,
    meta: {quietError: true},
  }));

  return (
    <Switch>
      <Match when={statusQuery.isPending}>
        <div class="w-full h-screen flex justify-center items-center">
          <MemoLoader size={300} />
        </div>
      </Match>
      <Match when={statusQuery.isSuccess}>
        <Navigate href="/" state={{fromLoginPage: true}} />
      </Match>
      <Match when={statusQuery.isError}>
        <Page title="Logowanie">
          <div
            class="min-h-screen h-screen max-h-screen flex justify-center items-center"
            style={{"background-color": "#f7f3e7"}}
          >
            <div class="w-[400px] p-6 rounded-sm border bg-white shadow-xl">
              <div class="flex flex-row justify-center mb-4">
                <img src="/img/memo_logo.svg" class="h-14" />
                <img src="/img/cpd_children_logo.svg" class="h-12" />
              </div>
              <LoginForm.Component />
            </div>
          </div>
        </Page>
      </Match>
    </Switch>
  );
};

export default LoginPage;
