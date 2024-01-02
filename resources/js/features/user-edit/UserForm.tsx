import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {HideableSection} from "components/ui/HideableSection";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {TextField} from "components/ui/form/TextField";
import {TRIM_ON_BLUR} from "components/ui/form/util";
import {useLangFunc} from "components/utils";
import {VoidComponent, createComputed, on, splitProps} from "solid-js";
import {z} from "zod";
import * as userMembersFormPart from "./UserMembersFormPart";

const getSchema = () =>
  z.object({
    name: z.string(),
    email: z.string(),
    hasEmailVerified: z.boolean(),
    hasPassword: z.boolean(),
    password: z.string(),
    members: userMembersFormPart.getSchema(),
    hasGlobalAdmin: z.boolean(),
  });

export type UserFormInput = z.input<ReturnType<typeof getSchema>>;
export type UserFormOutput = z.output<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<UserFormInput> {
  readonly id: string;
  readonly onCancel?: () => void;
}

export const UserForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel"]);
  const t = useLangFunc();
  // Cast because otherwise type info is lost for some reason.
  const initialValues = () => (formProps as Props).initialValues;
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
            <TextField name="name" type="text" {...TRIM_ON_BLUR} autofocus />
            <TextField name="email" type="email" {...TRIM_ON_BLUR} />
            <CheckboxField name="hasEmailVerified" disabled={!form.data("email")} />
          </div>
          <div class="flex flex-col">
            <CheckboxField
              name="hasPassword"
              disabled={!form.data("email")}
              title={!form.data("email") ? t("forms.user_edit.has_password_requires_email") : undefined}
            />
            <HideableSection show={form.data("hasPassword")}>
              <TextField
                name="password"
                type="password"
                {...(initialValues()?.hasPassword
                  ? {
                      label: t("forms.user_edit.fieldNames.newPassword"),
                      placeholder: t("forms.user_edit.password_empty_to_leave_unchanged"),
                    }
                  : {})}
                // Prevent password autocomplete. Just autocomplete="off" does not work.
                autocomplete="off"
                readonly
                onClick={(e) => {
                  e.currentTarget.readOnly = false;
                }}
              />
            </HideableSection>
          </div>
          <userMembersFormPart.UserMembersFormPart membersPath="members" />
          <CheckboxField
            name="hasGlobalAdmin"
            disabled={!form.data("hasPassword")}
            title={!form.data("hasPassword") ? t("forms.user_edit.global_admin_requires_password") : undefined}
          />
          <FelteSubmit cancel={props.onCancel} />
        </>
      )}
    </FelteForm>
  );
};
