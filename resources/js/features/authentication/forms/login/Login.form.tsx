import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {PasswordField} from "components/ui/form/PasswordField";
import {TextField} from "components/ui/form/TextField";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {createSignal, VoidComponent} from "solid-js";
import {z} from "zod";

const getSchema = () =>
  z.object({
    email: z.string(),
    password: z.string(),
  });

type Input = z.input<ReturnType<typeof getSchema>>;
type Output = z.output<ReturnType<typeof getSchema>>;

type PersistedState = {
  readonly email?: string;
};

interface Props {
  readonly onSuccess?: () => void;
}

export const LoginForm: VoidComponent<Props> = (props) => {
  const invalidate = useInvalidator();
  const [persistedEmail, setPersistedEmail] = createSignal<string>();
  createPersistence<PersistedState>({
    value: () => ({email: persistedEmail()}),
    onLoad: (state) => {
      setPersistedEmail(state.email);
    },
    storage: localStorageStorage("Login"),
  });
  const mutation = createMutation(() => ({
    mutationFn: User.login,
    meta: {isFormSubmit: true},
  }));

  const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
    await mutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      setPersistedEmail(values.email);
      props.onSuccess?.();
      invalidate.userStatusAndFacilityPermissions();
    };
  };

  const getInitialValues = (): Readonly<Input> => ({
    email: persistedEmail() || "",
    password: "",
  });

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
      <TextField
        name="email"
        type="email"
        autocomplete="username"
        autofocus={!persistedEmail()}
        // Remove the persisted email if the email is edited in any way.
        onInput={[setPersistedEmail, undefined]}
      />
      <PasswordField
        name="password"
        autocomplete="current-password"
        allowShow="sensitive"
        autofocus={!!persistedEmail()}
      />
      <FelteSubmit />
    </FelteForm>
  );
};
