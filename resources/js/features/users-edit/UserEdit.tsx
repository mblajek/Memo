import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {HideableSection} from "components/ui/HideableSection";
import {Checkbox} from "components/ui/form/Checkbox";
import {TextField} from "components/ui/form/TextField";
import {getTrimInputHandler} from "components/ui/form/util";
import {useLangFunc} from "components/utils";
import {AdminUserResource} from "data-access/memo-api/resources/adminUser.resource";
import {VoidComponent, createComputed, splitProps} from "solid-js";
import {z} from "zod";
import {UserMembersEdit} from "./UserMembersEdit";

export namespace UserEdit {
  export const getSchema = () =>
    z.object({
      name: z.string(),
      email: z.string(),
      hasEmailVerified: z.boolean(),
      hasPassword: z.boolean(),
      password: z.string(),
      members: UserMembersEdit.getSchema(),
      hasGlobalAdmin: z.boolean(),
    });

  export const getInitialValuesForEdit = (user: AdminUserResource): Input => ({
    name: user.name,
    email: user.email || "",
    hasEmailVerified: user.hasEmailVerified,
    hasPassword: user.hasPassword,
    password: "",
    members: UserMembersEdit.getInitialValuesForEdit(user),
    hasGlobalAdmin: user.hasGlobalAdmin,
  });

  export const getInitialValuesForCreate = (): Input => ({
    name: "",
    email: "",
    hasEmailVerified: false,
    hasPassword: false,
    password: "",
    members: UserMembersEdit.getInitialValuesForCreate(),
    hasGlobalAdmin: false,
  });

  export type Input = z.input<ReturnType<typeof getSchema>>;
  export type Output = z.output<ReturnType<typeof getSchema>>;

  interface Props extends FormConfigWithoutTransformFn<Input> {
    onCancel?: () => void;
    id: string;
  }

  export const EditForm: VoidComponent<Props> = (allProps) => {
    const [props, formProps] = splitProps(allProps, ["id", "onCancel"]);
    const t = useLangFunc();
    // Cast because otherwise type info is lost for some reason.
    const initialValues = () => (formProps as Props).initialValues;
    return (
      <FelteForm id={props.id} schema={getSchema()} {...formProps} class="flex flex-col gap-4">
        {(form) => {
          createComputed(() => {
            if (!form.data("email")) {
              form.setFields("hasPassword", false);
            }
            if (!form.data("hasPassword")) {
              form.setFields("hasGlobalAdmin", false);
            }
          });
          return (
            <>
              <div class="flex flex-col gap-1">
                <TextField name="name" type="text" onBlur={getTrimInputHandler()} />
                <TextField
                  name="email"
                  type="email"
                  onInput={() => form.setFields("hasEmailVerified", false)}
                  onBlur={getTrimInputHandler()}
                />
                <Checkbox name="hasEmailVerified" disabled={!form.data("email")} />
              </div>
              <div class="flex flex-col">
                <Checkbox
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
              <UserMembersEdit.MembersTable membersPath="members" />
              <Checkbox
                name="hasGlobalAdmin"
                disabled={!form.data("hasPassword")}
                title={!form.data("hasPassword") ? t("forms.user_edit.global_admin_requires_password") : undefined}
              />
              <FelteSubmit cancel={props.onCancel} />
            </>
          );
        }}
      </FelteForm>
    );
  };
}
