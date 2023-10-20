import {createMutation} from "@tanstack/solid-query";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {VoidComponent, createSignal} from "solid-js";
import toast from "solid-toast";
import {UserEdit} from "./UserEdit";
import {UserMembersEdit} from "./UserMembersEdit";

export namespace UserCreateForm {
  interface Props {
    onSuccess?: () => void;
    onCancel?: () => void;
  }

  export const Component: VoidComponent<Props> = (props) => {
    const t = useLangFunc();
    const invalidate = Admin.useInvalidator();
    const userMutation = createMutation(() => ({
      mutationFn: Admin.createUser,
      meta: {isFormSubmit: true},
    }));
    const membersUpdater = UserMembersEdit.useMembersUpdater();

    async function updateUser(values: UserEdit.Output) {
      // First create the user fields (without the members).
      const {data} = await userMutation.mutateAsync({
        name: values.name,
        ...(values.email
          ? {
              email: values.email,
              hasEmailVerified: values.hasEmailVerified,
              ...(values.hasPassword && values.password
                ? {password: values.password, passwordExpireAt: null}
                : {password: null, passwordExpireAt: null}),
            }
          : {
              email: null,
              hasEmailVerified: false,
              password: null,
              passwordExpireAt: null,
            }),
        hasGlobalAdmin: values.hasGlobalAdmin,
      });
      // If the user mutation succeeded, await all the members mutations. Await all even if any of
      // them fails, otherwise invalidation might happen before the final changes.
      try {
        await Promise.allSettled(membersUpdater.getCreatePromises(data.data.id, values.members));
      } finally {
        // Invalidate the user even after partial success (e.g. only user creation succeeded),
        // or when there were no member mutations.
        invalidate.users();
      }
      toast.success(t("forms.user_create.success"));
      props.onSuccess?.();
    }

    return (
      <UserEdit.EditForm
        id="user_create"
        onSubmit={updateUser}
        initialValues={UserEdit.getInitialValuesForCreate()}
        onCancel={props.onCancel}
      />
    );
  };

  const [modalOpen, setModalOpen] = createSignal(false);

  /**
   * The modal with the user edit form, initially hidden. To actually display the modal, call showModalFor
   * with the user id.
   *
   * This modal can be included in any page and it will show on top of whatever content was displayed
   * when showModal is called.
   */
  export const UserCreateModal: VoidComponent = () => {
    const t = useLangFunc();
    return (
      <Modal
        title={t("forms.user_create.formName")}
        open={modalOpen()}
        closeOn={["escapeKey", "closeButton"]}
        onClose={() => setModalOpen(false)}
        style={MODAL_STYLE_PRESETS.medium}
      >
        <Component onSuccess={() => setModalOpen(false)} onCancel={() => setModalOpen(false)} />
      </Modal>
    );
  };

  export function showModal() {
    setModalOpen(true);
  }
}
