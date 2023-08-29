import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {Button, TextField} from "components/ui";
import {Checkbox} from "components/ui/form/Checkbox";
import {Page} from "components/utils";
import {Component, createSignal} from "solid-js";
import {z} from "zod";

export const getSchema = () =>
  z.object({
    email: z.string().nonempty(),
    password: z.string().nonempty(),
    rememberMe: z.literal<boolean>(true),
    controlledCheckbox: z.boolean(),
  });

export const getInitialValues = (): Readonly<Input> => ({
  email: "",
  password: "",
  rememberMe: false,
  controlledCheckbox: false,
});

export type Input = z.input<ReturnType<typeof getSchema>>;
export type Output = z.output<ReturnType<typeof getSchema>>;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The test page.
 */
const TestFormPage: Component = () => {
  const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
    await delay(2000);
    console.log(values);
  };

  const [checked, setChecked] = createSignal(false);

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
        <Checkbox name="rememberMe" label="Remember me" />
        <Checkbox
          name="controlledCheckbox"
          label="Controlled checkbox"
          checked={checked()}
          onChange={({checked}) => {
            if (checked === "indeterminate") return; // TODO support indeterminate state
            setChecked(checked);
          }}
        />
        <Button
          type="button"
          onClick={() => {
            setChecked(!checked());
          }}
        >
          Toggle controlled checkbox ({checked().toString()})
        </Button>
        <FelteSubmit />
      </FelteForm>
    </Page>
  );
};

export default TestFormPage;
