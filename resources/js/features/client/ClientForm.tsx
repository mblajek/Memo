import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {ATTRIBUTES_SCHEMA} from "components/ui/form/AttributeFields";
import {createFormLeaveConfirmation} from "components/ui/form/form_leave_confirmation";
import {TextField} from "components/ui/form/TextField";
import {VoidComponent, splitProps} from "solid-js";
import {z} from "zod";
import {ClientFields} from "./ClientFields";

const getSchema = () =>
  z.object({
    name: z.string(),
    client: ATTRIBUTES_SCHEMA,
  });

export type ClientFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<ClientFormType> {
  readonly id: string;
  readonly onCancel?: () => void;
}

export const ClientForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel"]);
  const confirmation = createFormLeaveConfirmation();
  return (
    <FelteForm
      id={props.id}
      translationsFormNames={[props.id, "client", "facility_user"]}
      schema={getSchema()}
      translationsModel={["client", "facility_user"]}
      class="flex flex-col gap-4 items-stretch"
      {...formProps}
    >
      {(form) => {
        async function cancel() {
          if (!form.isDirty() || (await confirmation.confirm())) {
            props.onCancel?.();
          }
        }
        return (
          <>
            <TextField name="name" autofocus />
            <ClientFields editMode />
            <FelteSubmit cancel={props.onCancel ? cancel : undefined} />
          </>
        );
      }}
    </FelteForm>
  );
};
