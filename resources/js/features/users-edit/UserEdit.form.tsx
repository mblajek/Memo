import {SubmitContext} from "@felte/core";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {MODAL_STYLE_PRESETS, Modal as ModalComponent} from "components/ui";
import {QueryBarrier, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api";
import {Admin} from "data-access/memo-api/groups/Admin";
import {Api} from "data-access/memo-api/types";
import {Component, createSignal} from "solid-js";
import toast from "solid-toast";
import {UserEdit} from "./UserEdit";
import {UserMembersEdit} from "./UserMembersEdit";

export namespace UserEditForm {
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

    async function updateUser(values: UserEdit.Output, ctx: SubmitContext<UserEdit.Output>) {
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
        <UserEdit.EditForm
          id="user_edit"
          onSubmit={updateUser}
          initialValues={UserEdit.getInitialValuesForEdit(user()!)}
          onCancel={props.onCancel}
        />
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
