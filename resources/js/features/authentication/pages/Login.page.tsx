import { SubmitHandler, createForm, zodForm } from "@modular-forms/solid";
import { Navigate } from "@solidjs/router";
import { createMutation, useQueryClient } from "@tanstack/solid-query";
import { Button } from "components/ui";
import { Page, QueryBarrier } from "components/utils";
import { User } from "data-access/memo-api";
import { Component } from "solid-js";
import { z } from "zod";

namespace LoginForm {
  export const schema = z.object({
    email: z
      .string()
      .min(1, "Pole jest wymagane")
      .email("Wprowadź poprawny email"),
    password: z.string().min(1, "Pole wymagane"),
  });

  export const initialValues: Input = {
    email: "",
    password: "",
  };

  export type Input = z.input<typeof schema>;
  export type Output = z.output<typeof schema>;
}

const Content: Component = () => {
  const [, { Form, Field }] = createForm<LoginForm.Input>({
    initialValues: LoginForm.initialValues,
    validate: zodForm(LoginForm.schema),
  });
  const queryClient = useQueryClient();
  const mutation = createMutation({
    mutationFn: User.login,
    onSuccess() {
      queryClient.invalidateQueries(User.keys.status());
    },
  });

  const handleSubmit: SubmitHandler<LoginForm.Output> = (values) => {
    mutation.mutate({
      ...values,
    });
  };

  return (
    <Page title="Logowanie">
      <div
        class="min-h-screen h-screen max-h-screen flex justify-center items-center"
        style={{ "background-color": "#f7f3e7" }}
      >
        <Form
          onSubmit={handleSubmit}
          id="login-form"
          class="w-[400px] flex flex-col gap-4 p-6 rounded-sm border bg-white shadow-xl"
        >
          <div class="flex flex-row justify-center">
            <img src="/img/memo_logo.svg" class="h-14" />
            <img src="/img/cpd_children_logo.svg" class="h-12" />
          </div>
          <Field name="email">
            {(_, props) => (
              <input
                {...props}
                placeholder="Adres e-mail"
                type="email"
                class="border border-gray-400 rounded-sm p-2"
              />
            )}
          </Field>
          <Field name="password">
            {(_, props) => (
              <input
                {...props}
                placeholder="Hasło"
                type="password"
                class="border border-gray-400 rounded-sm p-2"
              />
            )}
          </Field>
          <Button class="bg-cyan-500 p-2 text-white" type="submit">
            Zaloguj się
          </Button>
        </Form>
      </div>
    </Page>
  );
};

const LoginPage: Component = () => {
  const statusQuery = User.useStatus({ meta: { quietError: true } });

  return (
    <QueryBarrier query={statusQuery} errorElement={<Content />}>
      <Navigate href="/help" />
    </QueryBarrier>
  );
};

export default LoginPage;
