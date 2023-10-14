import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation} from "@tanstack/solid-query";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {FullLogo, MODAL_STYLE_PRESETS, Modal as ModalComponent, TextField, getTrimInputHandler} from "components/ui";
import {User} from "data-access/memo-api";
import {VoidComponent, createSignal} from "solid-js";
import {z} from "zod";

export namespace LoginForm {
  export const getSchema = () =>
    z.object({
      email: z.string(),
      password: z.string(),
    });

  export const getInitialValues = (): Readonly<Input> => ({
    email: "",
    password: "",
  });

  export type Input = z.input<ReturnType<typeof getSchema>>;
  export type Output = z.output<ReturnType<typeof getSchema>>;

  interface Props {
    onSuccess?: () => void;
  }

  export const Component: VoidComponent<Props> = (props) => {
    const invalidateUser = User.useInvalidator();
    const mutation = createMutation(() => ({
      mutationFn: User.login,
      onSuccess() {
        invalidateUser.statusAndFacilityPermissions();
        props.onSuccess?.();
      },
      meta: {isFormSubmit: true},
    }));

    const onSubmit: FormConfigWithoutTransformFn<Output>["onSubmit"] = async (values) => {
      await mutation.mutateAsync(values);
    };

    return (
      <FelteForm
        id="login"
        onSubmit={onSubmit}
        schema={getSchema()}
        initialValues={getInitialValues()}
        class="flex flex-col gap-2"
      >
        <TextField name="email" type="email" autocomplete="username" onBlur={getTrimInputHandler()} />
        <TextField name="password" type="password" autocomplete="current-password" />
        <FelteSubmit />
      </FelteForm>
    );
  };

  const [modalShown, setModalShown] = createSignal(false);

  /**
   * The modal with the login form, initially hidden. To actually display the modal, call showModal.
   *
   * This modal can be included in any page and it will show on top of whatever content was displayed
   * when showModal is called.
   */
  export const Modal: VoidComponent = () => (
    <ModalComponent open={modalShown()} style={MODAL_STYLE_PRESETS.narrow}>
      <div class="flex flex-col gap-4">
        <div class="self-center">
          <FullLogo />
        </div>
        <Component onSuccess={() => setModalShown(false)} />
      </div>
    </ModalComponent>
  );

  export function showModal(show = true) {
    setModalShown(show);
  }
}
