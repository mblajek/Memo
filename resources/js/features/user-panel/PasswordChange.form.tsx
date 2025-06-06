import {useMutation} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {HiddenUsernameField} from "components/ui/form/HiddenUsernameField";
import {PasswordField} from "components/ui/form/PasswordField";
import {useLangFunc} from "components/utils/lang";
import {useLogOut} from "components/utils/log_out";
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

export interface PasswordChangeFormProps {
  readonly expirationSoon?: boolean;
  readonly forceChange?: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const PasswordChangeForm: VoidComponent<PasswordChangeFormProps> = (props) => {
  const t = useLangFunc();
  const logOut = useLogOut();
  const invalidate = useInvalidator();
  const mutation = useMutation(() => ({
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
      <Show when={props.expirationSoon}>
        <div class="font-semibold text-red-600">{t(`auth.password_expiration_soon`)}</div>
      </Show>
      <HiddenUsernameField />
      <PasswordField name="current" autocomplete="current-password" autofocus allowShow="sensitive" />
      <PasswordField name="password" autocomplete="new-password" allowShow="sensitive" />
      <PasswordField name="repeat" autocomplete="new-password" />
      <FelteSubmit
        cancel={() => {
          props.onCancel?.();
          if (props.forceChange) {
            logOut.logOut();
          }
        }}
        cancelLabel={props.forceChange ? t("actions.log_out") : undefined}
      />
    </FelteForm>
  );
};
