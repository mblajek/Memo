import {createMutation} from "@tanstack/solid-query";
import {currentDate, useLangFunc} from "components/utils";
import {dateTimeLocalInputToDateTime, dateTimeToDateTimeLocalInput} from "components/utils/day_minute_util";
import {toastSuccess} from "components/utils/toast";
import {Admin} from "data-access/memo-api/groups/Admin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {dateTimeToISO} from "data-access/memo-api/utils";
import {VoidComponent} from "solid-js";
import {UserForm, UserFormType} from "./UserForm";
import {useMembersUpdater} from "./UserMembersFormPart";

interface Props {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const UserCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const userMutation = createMutation(() => ({
    mutationFn: Admin.createUser,
    meta: {isFormSubmit: true},
  }));
  const membersUpdater = useMembersUpdater();

  function invalidateData() {
    // Invalidate the user even after partial success (e.g. only user creation succeeded),
    // or when there were no member mutations.
    invalidate.users();
    // Invalidate facility admins.
    invalidate.facilities();
  }

  async function updateUser(values: UserFormType) {
    // First create the user fields (without the members).
    const passwordExpireAt = values.passwordExpireAt
      ? dateTimeToISO(dateTimeLocalInputToDateTime(values.passwordExpireAt))
      : null;
    const {data} = await userMutation.mutateAsync({
      name: values.name,
      ...(values.email
        ? {
            email: values.email,
            hasEmailVerified: values.hasEmailVerified,
            hasPassword: values.hasPassword,
            ...(values.hasPassword && values.password
              ? {password: values.password, passwordExpireAt}
              : {password: null, passwordExpireAt}),
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
      await Promise.allSettled(membersUpdater.getCreatePromises(data.data.id, values.members));
    } catch (e) {
      invalidateData();
      throw e;
    }
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.user_create.success"));
      props.onSuccess?.();
      invalidateData();
    };
  }

  const initialValues = () =>
    ({
      name: "",
      email: "",
      hasEmailVerified: false,
      hasPassword: false,
      password: "",
      passwordExpireAt: dateTimeToDateTimeLocalInput(currentDate().plus({days: 7})),
      // At least the members array is required, otherwise the members form part fails to realise
      // that it should be an array.
      members: [],
      managedByFacilityId: "",
      hasGlobalAdmin: false,
    }) satisfies UserFormType;

  return <UserForm id="user_create" initialValues={initialValues()} onSubmit={updateUser} onCancel={props.onCancel} />;
};

// For lazy loading
export default UserCreateForm;
