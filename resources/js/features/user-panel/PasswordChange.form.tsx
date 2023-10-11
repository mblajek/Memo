import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation, createQuery} from "@tanstack/solid-query";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {MODAL_STYLE_PRESETS, Modal as ModalComponent, TextField} from "components/ui";
import {useLangFunc} from "components/utils";
import {User} from "data-access/memo-api";
import {VoidComponent, createSignal} from "solid-js";
import toast from "solid-toast";
import {z} from "zod";

export namespace PasswordChangeForm {
  export const getSchema = () =>
    z.object({
      current: z.string(),
      password: z.string(),
      repeat: z.string(),
    });

  export const getInitialValues = (): Readonly<Input> => ({
    current: "",
    password: "",
    repeat: "",
  });

  export type Input = z.input<ReturnType<typeof getSchema>>;
  export type Output = z.output<ReturnType<typeof getSchema>>;

  interface Props {
    onSuccess?: () => void;
    onCancel?: () => void;
  }

  export const Component: VoidComponent<Props> = (props) => {
    const t = useLangFunc();
    const invalidateUser = User.useInvalidator();
    const statusQuery = createQuery(User.statusQueryOptions);
    const mutation = createMutation(() => ({
      mutationFn: User.changePassword,
      onSuccess() {
        invalidateUser.statusAndFacilityPermissions();
        // For better integration with password managers.
        // https://www.chromium.org/developers/design-documents/create-amazing-password-forms/
        history.replaceState({passwordChanged: true}, "");
        toast.success(t("forms.password_change.success"));
        props.onSuccess?.();
      },
      meta: {isFormSubmit: true},
    }));

    const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
      await mutation.mutateAsync(values);
    };

    return (
      <FelteForm
        id="password_change"
        onSubmit={onSubmit}
        schema={getSchema()}
        initialValues={getInitialValues()}
        class="flex flex-col gap-2"
      >
        <input
          // For better integration with password managers.
          // https://www.chromium.org/developers/design-documents/create-amazing-password-forms/
          // TODO: Integration with Chrome password manager is still not good, investigate and fix.
          id="username"
          autocomplete="username"
          type="email"
          value={statusQuery.data?.user.email}
          class="hidden"
        />
        <TextField name="current" type="password" autocomplete="current-password" />
        <TextField name="password" type="password" autocomplete="new-password" />
        <TextField name="repeat" type="password" autocomplete="new-password" />
        <FelteSubmit cancel={props.onCancel} />
      </FelteForm>
    );
  };

  const [modalShown, setModalShown] = createSignal(false);

  /**
   * The modal with the password change form, initially hidden. To actually display the modal, call showModal.
   *
   * This modal can be included in any page and it will show on top of whatever content was displayed
   * when showModal is called.
   */
  export const Modal: VoidComponent = () => {
    const t = useLangFunc();
    return (
      <ModalComponent
        title={t("forms.password_change.formName")}
        open={modalShown()}
        closeOn={["escapeKey", "closeButton"]}
        onClose={() => setModalShown(false)}
        style={MODAL_STYLE_PRESETS.narrow}
      >
        <Component onSuccess={() => setModalShown(false)} onCancel={() => setModalShown(false)} />
      </ModalComponent>
    );
  };

  export function showModal(show = true) {
    setModalShown(show);
  }
}
