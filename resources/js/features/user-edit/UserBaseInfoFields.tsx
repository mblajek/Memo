import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {HideableSection} from "components/ui/HideableSection";
import {DocsModalInfoIcon} from "components/ui/docs_modal";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {DateField} from "components/ui/form/DateField";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {PasswordField} from "components/ui/form/PasswordField";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {TextField, TextFieldTextInput} from "components/ui/form/TextField";
import {cx} from "components/utils/classnames";
import {dateTimeLocalInputToDateTime, dateTimeToDateTimeLocalInput} from "components/utils/day_minute_util";
import {useLangFunc} from "components/utils/lang";
import {currentTimeMinute} from "components/utils/time";
import {Timeout} from "components/utils/timeout";
import {AdminUserResourceForPatch} from "data-access/memo-api/resources/adminUser.resource";
import {UserResource} from "data-access/memo-api/resources/user.resource";
import {dateTimeToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";
import {createComputed, createEffect, createMemo, JSX, Match, on, Show, Switch, VoidComponent} from "solid-js";
import {z} from "zod";

export const getUserBaseInfoSchema = () =>
  z.object({
    name: z.string(),
    email: z.string(),
    hasEmailVerified: z.boolean(),
    hasPassword: z.boolean(),
    password: z.string(),
    passwordExpireAt: z.string(),
    isOtpRequired: z.boolean(),
    otpRequiredAt: z.string(),
    hasOtpConfigured: z.boolean(),
    /** Helper fields, not part of the API. These are number fields. */
    passwordExpireAt_daysLeft: z.unknown(),
    otpRequiredAt_daysLeft: z.unknown(),
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
  const initialValues = createMemo(() => ({
    ...formConfig.initialValues,
    ...(props.origUser ? userBaseInfoInitialValuesForEdit(props.origUser) : undefined),
  }));
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
  createComputed(
    on(
      () => form.data("password"),
      (password, prevPassword) => {
        if (prevPassword !== undefined) {
          if (password) {
            if (!form.data("passwordExpireAt")) {
              form.setFields("passwordExpireAt", dateTimeToDateTimeLocalInput(currentTimeMinute().plus({days: 7})));
            }
          } else {
            form.setFields("passwordExpireAt", initialValues()?.passwordExpireAt);
          }
        }
      },
    ),
  );
  createComputed(
    on(
      () => form.data("isOtpRequired"),
      (isOtpRequired) => {
        if (isOtpRequired && !form.data("otpRequiredAt")) {
          form.setFields("otpRequiredAt", dateTimeToDateTimeLocalInput(currentTimeMinute().plus({days: 7})));
        }
      },
    ),
  );
  createComputed(
    on(
      () => form.data("otpRequiredAt"),
      (otpRequiredAt) => {
        if (!otpRequiredAt) {
          form.setFields("isOtpRequired", false);
        }
      },
    ),
  );

  const DateFieldWithDaysLeft: VoidComponent<{readonly name: string; readonly suffix?: JSX.Element}> = (dProps) => {
    const timeout = new Timeout();
    const daysLeftFieldName = () => `${dProps.name}_daysLeft`;
    createEffect(() => {
      form.setFields(
        daysLeftFieldName(),
        form.data(dProps.name)
          ? Math.max(
              0,
              Math.floor(
                dateTimeLocalInputToDateTime(form.data(dProps.name)).diff(currentTimeMinute(), "days").days +
                  // Add one hour to avoid bad rounding.
                  1 / 24,
              ),
            )
          : "",
      );
    });
    createEffect(
      on(
        () => form.data(daysLeftFieldName()),
        (value) => {
          if (value == undefined || value === "") {
            timeout.set(
              // eslint-disable-next-line solid/reactivity
              () => form.setFields(dProps.name, ""),
              1000,
            );
          } else {
            timeout.clear();
            form.setFields(dProps.name, dateTimeToDateTimeLocalInput(currentTimeMinute().plus({days: Number(value)})));
          }
        },
      ),
    );
    return (
      <div class="flex flex-col">
        <FieldLabel fieldName={dProps.name} />
        <div class="flex gap-1 items-baseline">
          <DateField
            class={cx("text-black", form.data(dProps.name) ? undefined : "text-opacity-50")}
            name={dProps.name}
            label=""
            type="datetime-local"
            showWeekday
            small
          />
          <div>
            {t("parenthesis.open")}
            {t("calendar.days_left")}
          </div>
          <TextFieldTextInput class="w-16" name={daysLeftFieldName()} type="number" min="0" small />
          <div>{t("parenthesis.close")}</div>
          {dProps.suffix}
        </div>
      </div>
    );
  };

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
        <HideableSection
          class="flex flex-col gap-2 ps-3 border-s-2 border-input-border"
          show={form.data("hasPassword")}
        >
          {({show}) => (
            <>
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
                  onClick={(e) => {
                    e.currentTarget.readOnly = false;
                  }}
                  disabled={!show()}
                  allowShow
                />
                <DateFieldWithDaysLeft
                  name="passwordExpireAt"
                  suffix={
                    <Switch>
                      <Match when={form.data("passwordExpireAt")}>
                        <Button class="linkLike" onClick={() => form.setFields("passwordExpireAt", "")}>
                          {t("forms.user.clear_password_expire_at")}
                        </Button>
                      </Match>
                      <Match when="expire never">
                        <div class="flex gap-3">
                          <span>{t("forms.user.password_expire_never")}</span>
                        </div>
                      </Match>
                    </Switch>
                  }
                />
                <HideableSection
                  class="text-red-600 font-bold"
                  show={
                    form.data("passwordExpireAt") &&
                    dateTimeLocalInputToDateTime(form.data("passwordExpireAt")).diff(currentTimeMinute(), "minutes")
                      .minutes < 1
                  }
                >
                  {t("forms.user.password_expired")}
                </HideableSection>
              </div>
              <div class="flex flex-col">
                <div class="flex gap-1">
                  <CheckboxField name="isOtpRequired" />
                  <DocsModalInfoIcon href="/help/staff-2fa-configuration.part" fullPageHref="/help/staff-2fa" />
                </div>
                <HideableSection class="ps-3 border-s-2 border-input-border" show={form.data("isOtpRequired")}>
                  <DateFieldWithDaysLeft name="otpRequiredAt" />
                  <HideableSection
                    class="text-red-600 font-bold"
                    show={
                      form.data("otpRequiredAt") &&
                      dateTimeLocalInputToDateTime(form.data("otpRequiredAt")).diff(currentTimeMinute(), "minutes")
                        .minutes < 1 &&
                      !form.data("hasOtpConfigured")
                    }
                  >
                    {t("forms.user.otp_required_expired")}
                  </HideableSection>
                </HideableSection>
                <HideableSection show={form.data("isOtpRequired") || initialValues()?.hasOtpConfigured}>
                  <div class="pt-1 flex">
                    <Show
                      when={initialValues()?.hasOtpConfigured}
                      fallback={<div>{t("forms.user.otp_configured_info.when_not_configured")}</div>}
                    >
                      <SegmentedControl
                        name="hasOtpConfigured"
                        label=""
                        items={[
                          {value: "true", label: () => t("forms.user.otp_configured_info.when_configured.true")},
                          {value: "false", label: () => t("forms.user.otp_configured_info.when_configured.false")},
                        ]}
                        value={String(form.data("hasOtpConfigured"))}
                        onValueChange={(v) => form.setFields("hasOtpConfigured", v === "true")}
                      />
                    </Show>
                  </div>
                </HideableSection>
              </div>
            </>
          )}
        </HideableSection>
      </div>
    </>
  );
};

export function userBaseInfoInitialValuesForEdit(user: UserResource) {
  return {
    name: user.name,
    email: user.email || "",
    hasEmailVerified: user.hasEmailVerified,
    hasPassword: user.hasPassword,
    password: "",
    passwordExpireAt: user.passwordExpireAt
      ? dateTimeToDateTimeLocalInput(DateTime.fromISO(user.passwordExpireAt))
      : "",
    isOtpRequired: user.otpRequiredAt !== null,
    otpRequiredAt: user.otpRequiredAt ? dateTimeToDateTimeLocalInput(DateTime.fromISO(user.otpRequiredAt)) : "",
    hasOtpConfigured: user.hasOtpConfigured,
  } satisfies UserBaseInfoFormType;
}

export function userBaseInfoInitialValuesForCreate() {
  return {
    name: "",
    email: "",
    hasEmailVerified: false,
    hasPassword: false,
    password: "",
    passwordExpireAt: dateTimeToDateTimeLocalInput(currentTimeMinute().plus({days: 7})),
    isOtpRequired: false,
    otpRequiredAt: "",
    hasOtpConfigured: false,
  } satisfies UserBaseInfoFormType;
}

export function getUserBaseInfoValues(values: UserBaseInfoFormType, oldUser: {hasPassword: boolean}) {
  return {
    name: values.name,
    ...(values.email
      ? {
          email: values.email,
          hasEmailVerified: values.hasEmailVerified,
          ...(values.hasPassword
            ? {
                hasPassword: true,
                password:
                  oldUser.hasPassword && !values.password
                    ? // The user has a password already and it is not changed.
                      undefined
                    : // New password or a password change.
                      values.password,
                passwordExpireAt: values.passwordExpireAt
                  ? dateTimeToISO(dateTimeLocalInputToDateTime(values.passwordExpireAt))
                  : null,
                otpRequiredAt:
                  values.isOtpRequired && values.otpRequiredAt
                    ? dateTimeToISO(dateTimeLocalInputToDateTime(values.otpRequiredAt))
                    : null,
                hasOtpConfigured: values.hasOtpConfigured,
              }
            : {
                hasPassword: false,
                password: null,
                passwordExpireAt: null,
                otpRequiredAt: null,
                hasOtpConfigured: false,
              }),
        }
      : {
          email: null,
          hasEmailVerified: false,
          hasPassword: false,
          password: null,
          passwordExpireAt: null,
          otpRequiredAt: null,
          hasOtpConfigured: false,
        }),
  } satisfies Omit<AdminUserResourceForPatch, "id">;
}
