import {SubmitContext} from "@felte/core";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {QueryBarrier, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {toastSuccess} from "components/utils/toast";
import {Admin, User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";
import {UserForm, UserFormType} from "./UserForm";
import {useMembersUpdater} from "./UserMembersFormPart";

interface FormParams {
  readonly userId: Api.Id;
}

interface Props extends FormParams {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const UserEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const statusQuery = createQuery(User.statusQueryOptions);
  const userQuery = createQuery(() => Admin.userQueryOptions(props.userId));
  const user = () => userQuery.data;
  const invalidate = useInvalidator();
  const userMutation = createMutation(() => ({
    mutationFn: Admin.updateUser,
    meta: {isFormSubmit: true},
  }));
  const membersUpdater = useMembersUpdater();

  function invalidateData() {
    // Invalidate the user even after partial success (e.g. only user edit succeeded), or when there were
    // no member mutations.
    invalidate.users();
    // Invalidate facility admins.
    invalidate.facilities();
    if (user()!.id === statusQuery.data?.user.id) {
      invalidate.userStatusAndFacilityPermissions();
    }
  }

  async function updateUser(values: UserFormType, ctx: SubmitContext<UserFormType>) {
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
      managedByFacilityId: values.managedByFacilityId,
      hasGlobalAdmin: values.hasGlobalAdmin,
    });
    // If the user mutation succeeded, await all the members mutations. Await all even if any of
    // them fails, otherwise invalidation might happen before the final changes.
    try {
      await Promise.allSettled(membersUpdater.getUpdatePromises(oldUser, values.members));
    } catch (e) {
      invalidateData();
      throw e;
    }
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.user_edit.success"));
      props.onSuccess?.();
      // Important: Invalidation should happen after calling onSuccess which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidateData();
    };
  }

  const initialValues = () => {
    const u = user()!;
    return {
      name: u.name,
      email: u.email || "",
      hasEmailVerified: u.hasEmailVerified,
      hasPassword: u.hasPassword,
      password: "",
      members: u.members.map(({facilityId, hasFacilityAdmin, isFacilityStaff, isFacilityClient}) => ({
        facilityId,
        hasFacilityAdmin,
        isFacilityStaff,
        isFacilityClient,
      })),
      managedByFacilityId: u.managedByFacilityId || "",
      hasGlobalAdmin: u.hasGlobalAdmin,
    } satisfies UserFormType;
  };

  return (
    <QueryBarrier queries={[userQuery]} ignoreCachedData {...notFoundError()}>
      <UserForm id="user_edit" initialValues={initialValues()} onSubmit={updateUser} onCancel={props.onCancel} />
    </QueryBarrier>
  );
};

// For lazy loading
export default UserEditForm;
