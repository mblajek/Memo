import {FormConfigWithoutTransformFn} from "@felte/core";
import {useTransContext} from "@mbarzda/solid-i18next";
import {createMutation, useQueryClient} from "@tanstack/solid-query";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {TextField} from "components/ui";
import {User} from "data-access/memo-api";
import {Component} from "solid-js";
import {z} from "zod";
import {getLangFunc} from "components/utils";

export namespace LoginForm {
  export const getSchema = () =>
    z.object({
      email: z.string(),
      password: z.string(),
    });

  export const getInitialValues = (): Readonly<Input> => ({
    email: "",
    password: "",
  });

  export type Input = z.input<ReturnType<typeof getSchema>>;
  export type Output = z.output<ReturnType<typeof getSchema>>;

  export const Component: Component = () => {
    const t = getLangFunc();
    const queryClient = useQueryClient();
    const mutation = createMutation(() => ({
      mutationFn: User.login,
      onSuccess() {
        queryClient.invalidateQueries({queryKey: User.keys.status()});
      },
    }));

    const onSubmit: FormConfigWithoutTransformFn<LoginForm.Output>["onSubmit"] =
      async (values) => {
        await mutation.mutateAsync(values);
      };

    return (
      <FelteForm
        onSubmit={onSubmit}
        schema={LoginForm.getSchema()}
        initialValues={getInitialValues()}
        id="login-form"
        class="flex flex-col gap-2"
      >
        <TextField name="email" label={t("email")} type="email" />
        <TextField name="password" label={t("password")} type="password" />
        <FelteSubmit form="login-form">{t("log_in")}</FelteSubmit>
      </FelteForm>
    );
  };
}
