import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {TextField} from "components/ui/form/TextField";
import {VoidComponent, splitProps} from "solid-js";
import {z} from "zod";

const getSchema = () =>
  z.object({
    name: z.string(),
    url: z.string(),
  });

export type FacilityFormInput = z.input<ReturnType<typeof getSchema>>;
export type FacilityFormOutput = z.output<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<FacilityFormInput> {
  readonly id: string;
  readonly onCancel?: () => void;
}

export const FacilityForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel"]);
  return (
    <FelteForm
      id={props.id}
      schema={getSchema()}
      translationsModel="facility"
      {...formProps}
      class="flex flex-col gap-4"
    >
      <div class="flex flex-col gap-1">
        <TextField name="name" type="text" autofocus />
        <TextField name="url" type="text" />
      </div>
      <FelteSubmit cancel={props.onCancel} />
    </FelteForm>
  );
};
