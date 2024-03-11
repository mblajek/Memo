import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {PasswordField} from "components/ui/form/PasswordField";
import {TextField} from "components/ui/form/TextField";
import {TRIM_ON_BLUR} from "components/ui/form/util";
import {User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {VoidComponent} from "solid-js";
import {z} from "zod";

const getSchema = () =>
  z.object({
    email: z.string(),
    password: z.string(),
  });

const getInitialValues = (): Readonly<Input> => ({
  email: "",
  password: "",
});

type Input = z.input<ReturnType<typeof getSchema>>;
type Output = z.output<ReturnType<typeof getSchema>>;

interface Props {
  readonly onSuccess?: () => void;
}

export const LoginForm: VoidComponent<Props> = (props) => {
  const invalidate = useInvalidator();
  const mutation = createMutation(() => ({
    mutationFn: User.login,
    onSuccess() {
      invalidate.userStatusAndFacilityPermissions();
      props.onSuccess?.();
    },
    meta: {isFormSubmit: true},
  }));

  const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
    await mutation.mutateAsync(values);
  };

  return (
    <FelteForm
      id="login"
      onSubmit={onSubmit}
      schema={getSchema()}
      translationsModel="user"
      initialValues={getInitialValues()}
      class="flex flex-col gap-2"
      preventPageLeave={false}
    >
      <TextField name="email" type="email" autocomplete="username" {...TRIM_ON_BLUR} autofocus />
      <PasswordField name="password" autocomplete="current-password" />
      <FelteSubmit />
    </FelteForm>
  );
};
