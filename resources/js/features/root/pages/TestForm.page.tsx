import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {TextField} from "components/ui";
import {Checkbox} from "components/ui/form/Checkbox";
import {Page} from "components/utils";
import {Component} from "solid-js";
import {z} from "zod";

export const getSchema = () =>
  z.object({
    email: z.string(),
    password: z.string(),
    rememberMe: z.boolean(),
  });

export const getInitialValues = (): Readonly<Input> => ({
  email: "",
  password: "",
  rememberMe: false,
});

export type Input = z.input<ReturnType<typeof getSchema>>;
export type Output = z.output<ReturnType<typeof getSchema>>;

/**
 * The test page.
 */
const TestFormPage: Component = () => {
  const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
    console.log(values);
  };

  return (
    <Page title="Logowanie">
      <FelteForm
        id="login"
        onSubmit={onSubmit}
        schema={getSchema()}
        initialValues={getInitialValues()}
        class="flex flex-col gap-2 max-w-sm"
      >
        <TextField name="email" type="email" autocomplete="username" />
        <TextField name="password" type="password" autocomplete="current-password" />
        <Checkbox name="rememberMe" label="Zapamiętaj mnie" />
        <FelteSubmit />
      </FelteForm>
    </Page>
  );
};

export default TestFormPage;
