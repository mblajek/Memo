import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {PasswordField} from "components/ui/form/PasswordField";
import {useLangFunc} from "components/utils";
import {toastSuccess} from "components/utils/toast";
import {User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {VoidComponent} from "solid-js";
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
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const PasswordChangeForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const statusQuery = createQuery(User.statusQueryOptions);
  const mutation = createMutation(() => ({
    mutationFn: User.changePassword,
    onSuccess() {
      invalidate.userStatusAndFacilityPermissions();
      // For better integration with password managers.
      // https://www.chromium.org/developers/design-documents/create-amazing-password-forms/
      history.replaceState({passwordChanged: true}, "");
      toastSuccess(t("forms.password_change.success"));
      props.onSuccess?.();
    },
    meta: {isFormSubmit: true},
  }));

  const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
    await mutation.mutateAsync(values);
  };

  return (
    <FelteForm
      id="password_change"
      onSubmit={onSubmit}
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
      <PasswordField name="current" autocomplete="current-password" autofocus />
      <PasswordField name="password" autocomplete="new-password" allowShow="whileHeld" />
      <PasswordField name="repeat" autocomplete="new-password" />
      <FelteSubmit cancel={props.onCancel} />
    </FelteForm>
  );
};
