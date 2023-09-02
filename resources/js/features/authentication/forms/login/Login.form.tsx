import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation} from "@tanstack/solid-query";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {FullLogo, MODAL_STYLE_PRESETS, Modal as ModalComponent, TextField} from "components/ui";
import {User} from "data-access/memo-api";
import {Component, createSignal} from "solid-js";
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

  export const Component: Component<Props> = (props) => {
    const invalidateUser = User.useInvalidator();
    const mutation = createMutation(() => ({
      mutationFn: User.login,
      onSuccess() {
        invalidateUser.status();
        props.onSuccess?.();
      },
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
        <TextField name="email" type="email" autocomplete="username" />
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
  export const Modal: Component = () => (
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
