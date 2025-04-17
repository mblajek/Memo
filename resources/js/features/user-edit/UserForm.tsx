import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {useLangFunc} from "components/utils/lang";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {getUserBaseInfoSchema, UserBaseInfoFields} from "features/user-edit/UserBaseInfoFields";
import {Show, splitProps, VoidComponent} from "solid-js";
import {z} from "zod";
import * as userMembersFormPart from "./UserMembersFormPart";

const getSchema = () =>
  getUserBaseInfoSchema().merge(
    z.object({
      members: userMembersFormPart.getSchema(),
      managedByFacilityId: z.string(),
      hasGlobalAdmin: z.boolean(),
    }),
  );

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
    >
      {(form) => (
        <>
          <UserBaseInfoFields autofocus />
          <userMembersFormPart.UserMembersFormPart membersPath="members" />
          <TQuerySelect name="managedByFacilityId" {...modelQuerySpecs.facility()!} nullable />
          <CheckboxField
            name="hasGlobalAdmin"
            disabled={!form.data("hasPassword")}
            title={!form.data("hasPassword") ? t("forms.user_edit.global_admin_requires_password") : undefined}
          />
          <Show when={userMembersFormPart.isUpdateDestructive(initialValues()?.members, form.data("members"))}>
            <div class="text-red-600 font-bold">{t("forms.user.members_destructive_update_warning")}</div>
          </Show>
          <FelteSubmit cancel={props.onCancel} />
        </>
      )}
    </FelteForm>
  );
};
