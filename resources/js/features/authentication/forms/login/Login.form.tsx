import {FormConfigWithoutTransformFn} from "@felte/core";
import {createMutation, useQueryClient} from "@tanstack/solid-query";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {FullLogo, TextField, Modal as ModalComponent} from "components/ui";
import {useLangFunc} from "components/utils";
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
    const t = useLangFunc();
    const queryClient = useQueryClient();
    const mutation = createMutation(() => ({
      mutationFn: User.login,
      onSuccess() {
        queryClient.invalidateQueries({queryKey: User.keys.status()});
        props.onSuccess?.();
      },
    }));

    const onSubmit: FormConfigWithoutTransformFn<LoginForm.Output>["onSubmit"] = async (values) => {
      await mutation.mutateAsync(values);
    };

    return (
      <FelteForm
        onSubmit={onSubmit}
        schema={LoginForm.getSchema()}
        initialValues={getInitialValues()}
        id="login-form"
        class="flex flex-col gap-2"
      >
        <TextField name="email" label={t("email")} type="email" />
        <TextField name="password" label={t("password")} type="password" />
        <FelteSubmit form="login-form">{t("log_in")}</FelteSubmit>
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
    <ModalComponent open={modalShown()}>
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
