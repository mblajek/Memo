import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {PasswordField} from "components/ui/form/PasswordField";
import {useLangFunc} from "components/utils/lang";
import {PasswordExpirationState} from "components/utils/password_expiration";
import {toastSuccess} from "components/utils/toast";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Show, VoidComponent} from "solid-js";
import {z} from "zod";

const getSchema = () =>
  z.object({
    current: z.string(),
    password: z.string(),
    repeat: z.string(),
  });

const getInitialValues = (): Readonly<Input> => ({
  current: "",
  password: "",
  repeat: "",
});

type Input = z.input<ReturnType<typeof getSchema>>;
type Output = z.output<ReturnType<typeof getSchema>>;

interface Props {
  readonly expiration?: PasswordExpirationState;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const PasswordChangeForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const statusQuery = createQuery(User.statusQueryOptions);
  const mutation = createMutation(() => ({
    mutationFn: User.changePassword,
    meta: {isFormSubmit: true},
  }));

  async function changePassword(values: Output) {
    await mutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      // For better integration with password managers.
      // https://www.chromium.org/developers/design-documents/create-amazing-password-forms/
      history.replaceState({passwordChanged: true}, "");
      toastSuccess(t("forms.password_change.success"));
      props.onSuccess?.();
      invalidate.userStatusAndFacilityPermissions();
    };
  }

  return (
    <FelteForm
      id="password_change"
      onSubmit={changePassword}
      schema={getSchema()}
      initialValues={getInitialValues()}
      class="flex flex-col gap-2"
      preventPageLeave={false}
    >
      <input
        // For better integration with password managers.
        // https://www.chromium.org/developers/design-documents/create-amazing-password-forms/
        // TODO: Integration with Chrome password manager is still not good, investigate and fix.
        id="username"
        autocomplete="username"
        type="email"
        value={statusQuery.data?.user.email || undefined}
        class="hidden"
      />
      <PasswordField name="current" autocomplete="current-password" autofocus allowShow="sensitive" />
      <PasswordField name="password" autocomplete="new-password" allowShow="sensitive" />
      <PasswordField name="repeat" autocomplete="new-password" />
      <Show when={props.expiration}>
        {(expiration) => <div class="font-semibold text-red-600">{t(`auth.password_expiration.${expiration()}`)}</div>}
      </Show>
      <FelteSubmit cancel={props.onCancel} />
    </FelteForm>
  );
};
