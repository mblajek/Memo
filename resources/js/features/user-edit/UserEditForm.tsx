import {SubmitContext} from "@felte/core";
import {useMutation, useQuery} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {notFoundError} from "components/utils/NotFoundError";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {toastSuccess} from "components/utils/toast";
import {Admin} from "data-access/memo-api/groups/Admin";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {getUserBaseInfoValues, userBaseInfoInitialValuesForEdit} from "features/user-edit/UserBaseInfoFields";
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
  const statusQuery = useQuery(User.statusQueryOptions);
  const userQuery = useQuery(() => Admin.userQueryOptions(props.userId));
  const user = () => userQuery.data;
  const invalidate = useInvalidator();
  const userMutation = useMutation(() => ({
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
      ...getUserBaseInfoValues(values, oldUser),
      managedByFacilityId: values.managedByFacilityId,
      hasGlobalAdmin: values.hasGlobalAdmin,
    });
    // If the user mutation succeeded, await all the members mutations. Await all even if any of
    // them fails, otherwise invalidation might happen before the final changes.
    const memberPromises = await Promise.allSettled(membersUpdater.getUpdatePromises(oldUser, values.members));
    if (memberPromises.some((p) => p.status === "rejected")) {
      invalidateData();
      return;
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
      ...userBaseInfoInitialValuesForEdit(u),
      members: u.members.map(
        ({facilityId, hasFacilityAdmin, isFacilityStaff, isActiveFacilityStaff, isFacilityClient}) => ({
          facilityId,
          hasFacilityAdmin,
          isFacilityStaff,
          isActiveFacilityStaff,
          isFacilityClient,
        }),
      ),
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
