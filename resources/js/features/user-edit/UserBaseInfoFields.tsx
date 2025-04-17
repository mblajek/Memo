import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {HideableSection} from "components/ui/HideableSection";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DateField} from "components/ui/form/DateField";
import {PasswordField} from "components/ui/form/PasswordField";
import {TextField} from "components/ui/form/TextField";
import {cx} from "components/utils/classnames";
import {dateTimeLocalInputToDateTime, dateTimeToDateTimeLocalInput} from "components/utils/day_minute_util";
import {useLangFunc} from "components/utils/lang";
import {currentDate, currentTimeMinute} from "components/utils/time";
import {UserResource} from "data-access/memo-api/resources/user.resource";
import {dateTimeToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";
import {createComputed, Match, on, Switch, VoidComponent} from "solid-js";
import {z} from "zod";

export const getUserBaseInfoSchema = () =>
  z.object({
    name: z.string(),
    email: z.string(),
    hasEmailVerified: z.boolean(),
    hasPassword: z.boolean(),
    password: z.string(),
    passwordExpireAt: z.string(),
  });

export type UserBaseInfoFormType = z.infer<ReturnType<typeof getUserBaseInfoSchema>>;

interface Props {
  /**
   * The original user data. Used for getting the information whether the user had password before,
   * if it cannot be obtained from the form initial values.
   */
  readonly origUser?: UserResource;
  readonly autofocus?: boolean;
}

export const UserBaseInfoFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {form, formConfig} = useFormContext();
  createComputed(() => {
    if (!form.data("email")) {
      form.setFields("hasPassword", false);
    }
    if (!form.data("hasPassword")) {
      form.setFields("hasGlobalAdmin", false);
    }
  });
  // Unverify email on email change.
  createComputed(
    on(
      () => form.data("email"),
      (email, prevEmail) => {
        if (prevEmail !== undefined) {
          form.setFields("hasEmailVerified", false);
        }
      },
    ),
  );
  return (
    <>
      <div class="flex flex-col gap-1">
        <TextField name="name" type="text" autofocus={props.autofocus} />
        <TextField name="email" type="email" />
        <CheckboxField name="hasEmailVerified" disabled={!form.data("email")} />
      </div>
      <div class="flex flex-col">
        <CheckboxField
          name="hasPassword"
          disabled={!form.data("email")}
          title={!form.data("email") ? t("forms.user_edit.has_password_requires_email") : undefined}
        />
        <HideableSection show={form.data("hasPassword")}>
          {({show}) => (
            <div class="flex flex-col">
              <PasswordField
                name="password"
                {...((formConfig.initialValues?.hasPassword ?? props.origUser?.hasPassword)
                  ? {
                      label: t("forms.user_edit.field_names.newPassword"),
                      placeholder: t("forms.user_edit.password_empty_to_leave_unchanged"),
                    }
                  : {})}
                // Prevent password autocomplete. Just autocomplete="off" does not work.
                autocomplete="off"
                readonly
                disabled={!show()}
                allowShow
                onClick={(e) => {
                  e.currentTarget.readOnly = false;
                }}
              />
              <DateField
                class={cx("text-black", form.data("passwordExpireAt") ? undefined : "text-opacity-50")}
                name="passwordExpireAt"
                type="datetime-local"
                showWeekday
              />
              <div>
                <Switch>
                  <Match when={form.data("passwordExpireAt")}>
                    <Button class="linkLike" onClick={() => form.setFields("passwordExpireAt", "")}>
                      {t("forms.user.clear_password_expire_at")}
                    </Button>
                  </Match>
                  <Match when="expire never">
                    <div class="flex gap-3">
                      <span>{t("forms.user.password_expire_never")}</span>
                      <Button
                        class="linkLike"
                        onClick={() =>
                          form.setFields(
                            "passwordExpireAt",
                            dateTimeToDateTimeLocalInput(currentDate().plus({weeks: 1})),
                          )
                        }
                      >
                        {t("forms.user.set_password_expire_in_7d")}
                      </Button>
                      <Button
                        class="linkLike"
                        onClick={() =>
                          form.setFields("passwordExpireAt", dateTimeToDateTimeLocalInput(currentTimeMinute()))
                        }
                      >
                        {t("forms.user.set_password_expired")}
                      </Button>
                    </div>
                  </Match>
                </Switch>
              </div>
            </div>
          )}
        </HideableSection>
      </div>
    </>
  );
};

export function userBaseInfoInitialValues(user: UserResource) {
  return {
    name: user.name,
    email: user.email || "",
    hasEmailVerified: user.hasEmailVerified,
    hasPassword: user.hasPassword,
    password: "",
    passwordExpireAt: user.passwordExpireAt
      ? dateTimeToDateTimeLocalInput(DateTime.fromISO(user.passwordExpireAt))
      : "",
  };
}

export function getUserBaseInfoValues(values: UserBaseInfoFormType, oldUser: {hasPassword: boolean}) {
  const passwordExpireAt = values.passwordExpireAt
    ? dateTimeToISO(dateTimeLocalInputToDateTime(values.passwordExpireAt))
    : null;
  return {
    name: values.name,
    ...(values.email
      ? {
          email: values.email,
          hasEmailVerified: values.hasEmailVerified,
          ...(values.hasPassword
            ? oldUser.hasPassword && !values.password
              ? // The user has a password already and it is not changed.
                {hasPassword: true, passwordExpireAt}
              : // New password or a password change.
                {hasPassword: true, password: values.password, passwordExpireAt}
            : {hasPassword: false, password: null, passwordExpireAt: null}),
        }
      : {
          email: null,
          hasEmailVerified: false,
          hasPassword: false,
          password: null,
          passwordExpireAt: null,
        }),
  };
}
