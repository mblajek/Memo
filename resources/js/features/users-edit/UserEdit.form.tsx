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
import {Admin} from "data-access/memo-api/groups/Admin";
import {AdminUserResource} from "data-access/memo-api/resources/adminUser.resource";
import {Api} from "data-access/memo-api/types";
import {Component, createSignal} from "solid-js";
import {z} from "zod";

export namespace UserEditForm {
  export const getSchema = () =>
    z.object({
      name: z.string(),
      email: z.string(),
      hasEmailVerified: z.boolean(),
      hasPassword: z.boolean(),
      password: z.string(),
    });

  export const getInitialValues = (user: AdminUserResource): Readonly<Input> => ({
    name: user.name,
    email: user.email || "",
    hasEmailVerified: user.hasEmailVerified,
    hasPassword: user.hasPassword,
    password: "",
  });

  export type Input = z.input<ReturnType<typeof getSchema>>;
  export type Output = z.output<ReturnType<typeof getSchema>>;

  interface FormParams {
    userId: Api.Id;
  }

  interface Props extends FormParams {
    onSuccess?: () => void;
  }

  export const Component: Component<Props> = (props) => {
    const t = useLangFunc();
    const userQuery = createQuery(() => Admin.userQueryOptions(props.userId));
    const user = () => userQuery.data;
    const invalidate = Admin.useInvalidator();
    const mutation = createMutation(() => ({
      mutationFn: Admin.updateUser,
      onSuccess() {
        invalidate.users();
        props.onSuccess?.();
      },
      meta: {isFormSubmit: true},
    }));
    async function onSubmit(values: Output) {
      await mutation.mutateAsync({
        id: user()!.id,
        name: values.name,
        ...(values.email
          ? {
              email: values.email,
              hasEmailVerified: values.hasEmailVerified,
              ...(values.hasPassword
                ? user()?.hasPassword && !values.password
                  ? // The user had password already and it is not changed.
                    {}
                  : // New password or a password change.
                    {password: values.password, passwordExpireAt: null}
                : {password: null}),
            }
          : {email: null}),
      });
    }

    return (
      <QueryBarrier queries={[userQuery]}>
        <FelteForm
          id="user_edit"
          onSubmit={onSubmit}
          schema={getSchema()}
          initialValues={getInitialValues(user()!)}
          class="flex flex-col gap-2"
        >
          {(form) => (
            <>
              <TextField name="name" type="text" autocomplete="off" onBlur={getTrimInputHandler()} />
              <div class="flex flex-col">
                <TextField
                  name="email"
                  type="email"
                  autocomplete="off"
                  onInput={() => {
                    form.setFields("hasEmailVerified", false);
                    if (!form.data("email")) {
                      form.setFields("hasPassword", false);
                    }
                  }}
                  onBlur={getTrimInputHandler()}
                />
                <Checkbox name="hasEmailVerified" disabled={!form.data("email")} />
              </div>
              <div class="flex flex-col">
                <Checkbox name="hasPassword" disabled={!form.data("email")} />
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
              <FelteSubmit />
            </>
          )}
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
        style={MODAL_STYLE_PRESETS.narrow}
      >
        {(params) => <Component userId={params().userId} onSuccess={() => setModalShownFor(undefined)} />}
      </ModalComponent>
    );
  };

  export function showModalFor(params: FormParams) {
    setModalShownFor(params);
  }
}
