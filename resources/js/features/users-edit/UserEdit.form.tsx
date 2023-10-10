import {SubmitContext} from "@felte/core";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {MODAL_STYLE_PRESETS, Modal as ModalComponent} from "components/ui";
import {QueryBarrier, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api";
import {Admin} from "data-access/memo-api/groups";
import {Api} from "data-access/memo-api/types";
import {VoidComponent, createSignal} from "solid-js";
import toast from "solid-toast";
import {noCacheQueryParams} from "../../data-access/memo-api/utils";
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

  export const Component: VoidComponent<Props> = (props) => {
    const t = useLangFunc();
    const statusQuery = createQuery(User.statusQueryOptions);
    // eslint-disable-next-line solid/reactivity
    const userQuery = createQuery(noCacheQueryParams(() => Admin.userQueryOptions(props.userId)));
    const user = () => userQuery.data;
    const adminInvalidate = Admin.useInvalidator();
    const userInvalidate = User.useInvalidator();
    const userMutation = createMutation(() => ({
      mutationFn: Admin.updateUser,
      meta: {isFormSubmit: true},
    }));
    const membersUpdater = UserMembersEdit.useMembersUpdater();

    async function updateUser(values: UserEdit.Output, ctx: SubmitContext<UserEdit.Output>) {
      const oldUser = user()!;
      if (oldUser.id === statusQuery.data?.user.id) {
        let err = false;
        if (oldUser.hasGlobalAdmin && !values.hasGlobalAdmin) {
          ctx.setErrors("hasGlobalAdmin", t("forms.user_edit.validation.cannot_remove_own_global_admin"));
          err = true;
        }
        if (oldUser.hasEmailVerified && !values.hasEmailVerified) {
          ctx.setErrors("hasEmailVerified", t("forms.user_edit.validation.cannot_remove_own_email_verified"));
          err = true;
        }
        if (err) {
          return;
        }
      }
      // First mutate the user fields (without the members).
      await userMutation.mutateAsync({
        id: oldUser.id,
        name: values.name,
        ...(values.email
          ? {
              email: values.email,
              hasEmailVerified: values.hasEmailVerified,
              hasPassword: values.hasPassword,
              ...(values.hasPassword
                ? oldUser.hasPassword && !values.password
                  ? // The user has a password already and it is not changed.
                    {}
                  : // New password or a password change.
                    {password: values.password, passwordExpireAt: null}
                : {password: null, passwordExpireAt: null}),
            }
          : {
              email: null,
              hasEmailVerified: false,
              hasPassword: false,
              password: null,
              passwordExpireAt: null,
            }),
        hasGlobalAdmin: values.hasGlobalAdmin,
      });
      // If the user mutation succeeded, await all the members mutations. Await all even if any of
      // them fails, otherwise invalidation might happen before the final changes.
      try {
        await Promise.allSettled(membersUpdater.getUpdatePromises(oldUser, values.members));
        toast.success(t("forms.user_edit.success"));
        props.onSuccess?.();
      } finally {
        // Invalidate the user even after partial success (e.g. only user edit succeeded), or when there were
        // no member mutations.
        // Important: Invalidation should happen after calling onSuccess which typically closes the form.
        // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
        // but also causes problems apparently.
        adminInvalidate.users();
        if (oldUser.id === statusQuery.data?.user.id) {
          userInvalidate.statusAndFacilityPermissions();
        }
      }
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
  export const Modal: VoidComponent = () => {
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
