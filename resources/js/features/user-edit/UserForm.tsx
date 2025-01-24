import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {Button} from "components/ui/Button";
import {HideableSection} from "components/ui/HideableSection";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {PasswordField} from "components/ui/form/PasswordField";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {TextField} from "components/ui/form/TextField";
import {cx} from "components/utils/classnames";
import {dateTimeToDateTimeLocalInput} from "components/utils/day_minute_util";
import {useLangFunc} from "components/utils/lang";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {currentDate, currentTimeMinute} from "components/utils/time";
import {Match, Show, Switch, VoidComponent, createComputed, on, splitProps} from "solid-js";
import {z} from "zod";
import * as userMembersFormPart from "./UserMembersFormPart";

const getSchema = () =>
  z.object({
    name: z.string(),
    email: z.string(),
    hasEmailVerified: z.boolean(),
    hasPassword: z.boolean(),
    password: z.string(),
    passwordExpireAt: z.string(),
    members: userMembersFormPart.getSchema(),
    managedByFacilityId: z.string(),
    hasGlobalAdmin: z.boolean(),
  });

export type UserFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<UserFormType> {
  readonly id: string;
  readonly onCancel?: () => void;
}

export const UserForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel"]);
  const t = useLangFunc();
  const modelQuerySpecs = useModelQuerySpecs();
  // Cast because otherwise type info is lost for some reason.
  const initialValues = () => (formProps as Props).initialValues as UserFormType;
  return (
    <FelteForm
      id={props.id}
      schema={getSchema()}
      translationsFormNames={[props.id, "user"]}
      translationsModel="user"
      {...formProps}
      class="flex flex-col gap-4"
      onFormCreated={(form) => {
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
      }}
    >
      {(form) => (
        <>
          <div class="flex flex-col gap-1">
            <TextField name="name" type="text" autofocus />
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
                    {...(initialValues()?.hasPassword
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
                  <TextField
                    class={cx("text-black", form.data("passwordExpireAt") ? undefined : "text-opacity-50")}
                    name="passwordExpireAt"
                    type="datetime-local"
                  />
                  <div>
                    <Switch>
                      <Match when={form.data("passwordExpireAt")}>
                        <Button class="linkLike" onClick={() => form.setFields("passwordExpireAt", "")}>
                          {t("forms.user.clear_password_expire_at")}
                        </Button>
                      </Match>
                      <Match when="expire never">
                        {t("forms.user.password_expire_never")}{" "}
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
                        ,{" "}
                        <Button
                          class="linkLike"
                          onClick={() =>
                            form.setFields("passwordExpireAt", dateTimeToDateTimeLocalInput(currentTimeMinute()))
                          }
                        >
                          {t("forms.user.set_password_expired")}
                        </Button>
                      </Match>{" "}
                    </Switch>
                  </div>
                </div>
              )}
            </HideableSection>
          </div>
          <userMembersFormPart.UserMembersFormPart membersPath="members" />
          <TQuerySelect name="managedByFacilityId" {...modelQuerySpecs.facility()!} nullable />
          <CheckboxField
            name="hasGlobalAdmin"
            disabled={!form.data("hasPassword")}
            title={!form.data("hasPassword") ? t("forms.user_edit.global_admin_requires_password") : undefined}
          />
          <Show when={userMembersFormPart.isUpdateDestructive(initialValues()?.members, form.data("members"))}>
            <div class="text-red-600 font-medium">
              <p>{t("forms.user.members_destructive_update_warning.header")}</p>
              <p>{t("forms.user.members_destructive_update_warning.line1")}</p>
              <p>{t("forms.user.members_destructive_update_warning.line2")}</p>
            </div>
          </Show>
          <FelteSubmit cancel={props.onCancel} />
        </>
      )}
    </FelteForm>
  );
};
