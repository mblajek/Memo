import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {isValidationMessageEmpty} from "components/felte-form/ValidationMessages";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {OTPField} from "components/ui/form/OTPField";
import {PasswordField} from "components/ui/form/PasswordField";
import {TextField} from "components/ui/form/TextField";
import {HideableSection} from "components/ui/HideableSection";
import {MutationMeta} from "components/utils/InitializeTanstackQuery";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {createEffect, createSignal, VoidComponent} from "solid-js";
import {setProbablyLoggedIn} from "state/probablyLoggedIn.state";
import {z} from "zod";

const getSchema = () =>
  z.object({
    email: z.string(),
    password: z.string(),
    otp: z.string(),
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
  const [showOTP, setShowOTP] = createSignal(false);
  /** Password to be used when showOTP is true instead of the one from the form. */
  const [password, setPassword] = createSignal("");
  createPersistence<PersistedState>({
    value: () => ({email: persistedEmail()}),
    onLoad: (state) => {
      setPersistedEmail(state.email);
    },
    storage: localStorageStorage("Login"),
  });
  const mutation = createMutation(() => ({
    mutationFn: User.login,
    meta: {
      isFormSubmit: true,
      getErrorsToShow: (errorsToShow, error) =>
        !showOTP() &&
        errorsToShow.length === 1 &&
        errorsToShow[0]!.code === "exception.validation" &&
        error.response?.data.errors.some(
          (e) => Api.isValidationError(e) && e.field === "otp" && e.code === "validation.required",
        )
          ? []
          : errorsToShow,
    } satisfies MutationMeta,
  }));

  const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
    await mutation.mutateAsync({
      ...values,
      password: showOTP() ? password() : values.password,
    });
    // eslint-disable-next-line solid/reactivity
    return () => {
      setProbablyLoggedIn(true);
      setPersistedEmail(values.email);
      props.onSuccess?.();
      invalidate.userStatusAndFacilityPermissions();
    };
  };

  const getInitialValues = (): Readonly<Input> => ({
    email: persistedEmail() || "",
    password: "",
    otp: "",
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
      {(form) => {
        createEffect(() => {
          if (!showOTP()) {
            if (isValidationMessageEmpty(form.errors("otp"))) {
              setTimeout(() => form.setFields("otp", ""));
            } else {
              setShowOTP(true);
              setPassword(form.data("password"));
              form.setFields("password", "*".repeat(password().length));
              form.setErrors("otp", undefined);
              setTimeout(() => {
                const otpField = document.querySelector("#otp");
                if (otpField instanceof HTMLElement) {
                  otpField.focus();
                }
              }, 100);
            }
          }
        });
        return (
          <>
            <TextField
              name="email"
              type="email"
              autocomplete="username"
              autofocus={!persistedEmail() && !showOTP()}
              onInput={() => {
                // Remove the persisted email if the email is edited in any way.
                setPersistedEmail(undefined);
                setShowOTP(false);
                setTimeout(() => form.setFields("password", ""));
              }}
            />
            <PasswordField
              name="password"
              autocomplete="current-password"
              allowShow={showOTP() ? false : "sensitive"}
              autofocus={!!persistedEmail() && !showOTP()}
              disabled={showOTP()}
            />
            <HideableSection class="-mt-2" show={showOTP()}>
              <div class="mt-2">
                <OTPField name="otp" autofocus showInfo />
              </div>
            </HideableSection>
            <FelteSubmit />
          </>
        );
      }}
    </FelteForm>
  );
};
