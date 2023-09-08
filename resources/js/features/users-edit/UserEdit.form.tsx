import {SubmitContext} from "@felte/core";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {
  Checkbox,
  HideableSection,
  MODAL_STYLE_PRESETS,
  Modal as ModalComponent,
  TextField,
  getTrimInputHandler,
} from "components/ui";
import {QueryBarrier, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api";
import {Admin} from "data-access/memo-api/groups/Admin";
import {AdminUserResource} from "data-access/memo-api/resources/adminUser.resource";
import {Api} from "data-access/memo-api/types";
import {Component, createComputed, createSignal} from "solid-js";
import toast from "solid-toast";
import {z} from "zod";
import {UserMembersEdit} from "./UserMembersEdit";

export namespace UserEditForm {
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

  export const getInitialValues = (user: AdminUserResource): Input => ({
    name: user.name,
    email: user.email || "",
    hasEmailVerified: user.hasEmailVerified,
    hasPassword: user.hasPassword,
    password: "",
    members: UserMembersEdit.getInitialValues(user),
    hasGlobalAdmin: user.hasGlobalAdmin,
  });

  export type Input = z.input<ReturnType<typeof getSchema>>;
  export type Output = z.output<ReturnType<typeof getSchema>>;

  interface FormParams {
    userId: Api.Id;
  }

  interface Props extends FormParams {
    onSuccess?: () => void;
    onCancel?: () => void;
  }

  export const Component: Component<Props> = (props) => {
    const t = useLangFunc();
    const statusQuery = createQuery(() => User.statusQueryOptions);
    const userQuery = createQuery(() => Admin.userQueryOptions(props.userId));
    const user = () => userQuery.data;
    const invalidate = Admin.useInvalidator();
    const userMutation = createMutation(() => ({mutationFn: Admin.updateUser}));
    const membersUpdater = UserMembersEdit.useMembersUpdater();

    async function updateUser(values: Output, ctx: SubmitContext<Output>) {
      const oldUser = user()!;
      if (oldUser.id === statusQuery.data?.user.id && oldUser.hasGlobalAdmin && !values.hasGlobalAdmin) {
        ctx.setErrors("hasGlobalAdmin", t("forms.user_edit.validation.cannot_remove_own_global_admin"));
        return;
      }
      // First mutate the user fields (without the members).
      await userMutation.mutateAsync({
        id: oldUser.id,
        name: values.name,
        ...(values.email
          ? {
              email: values.email,
              hasEmailVerified: values.hasEmailVerified,
              ...(values.hasPassword
                ? oldUser.hasPassword && !values.password
                  ? // The user had password already and it is not changed.
                    {}
                  : // New password or a password change.
                    {password: values.password, passwordExpireAt: null}
                : {password: null}),
            }
          : {email: null}),
        hasGlobalAdmin: values.hasGlobalAdmin,
      });
      // If the user mutation succeeded, await all the members mutations.
      try {
        await Promise.all(membersUpdater.getUpdatePromises(oldUser, values.members));
      } finally {
        // Invalidate the user even after partial success (e.g. only user edit succeeded), or when there were
        // no member mutations.
        invalidate.users();
      }
      toast.success(t("forms.user_edit.success"));
      props.onSuccess?.();
    }

    return (
      <QueryBarrier queries={[userQuery]}>
        <FelteForm
          id="user_edit"
          onSubmit={updateUser}
          schema={getSchema()}
          initialValues={getInitialValues(user()!)}
          class="flex flex-col gap-4"
        >
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
                  <TextField name="name" type="text" autocomplete="off" onBlur={getTrimInputHandler()} />
                  <TextField
                    name="email"
                    type="email"
                    autocomplete="off"
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
                      {...(user()?.hasPassword
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
      </QueryBarrier>
    );
  };

  const [modalShownFor, setModalShownFor] = createSignal<FormParams>();

  /**
   * The modal with the user edit form, initially hidden. To actually display the modal, call showModalFor
   * with the user id.
   *
   * This modal can be included in any page and it will show on top of whatever content was displayed
   * when showModal is called.
   */
  export const Modal: Component = () => {
    const t = useLangFunc();
    return (
      <ModalComponent
        title={t("forms.user_edit.formName")}
        open={modalShownFor()}
        closeOn={["escapeKey", "closeButton"]}
        onClose={() => setModalShownFor(undefined)}
        style={MODAL_STYLE_PRESETS.medium}
      >
        {(params) => (
          <Component
            userId={params().userId}
            onSuccess={() => setModalShownFor(undefined)}
            onCancel={() => setModalShownFor(undefined)}
          />
        )}
      </ModalComponent>
    );
  };

  export function showModalFor(params: FormParams) {
    setModalShownFor(params);
  }
}
