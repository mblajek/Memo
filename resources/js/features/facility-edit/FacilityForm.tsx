import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {TextField} from "components/ui/form/TextField";
import {getTrimInputHandler} from "components/ui/form/util";
import {VoidComponent, splitProps} from "solid-js";
import {z} from "zod";

const getSchema = () =>
  z.object({
    name: z.string(),
    url: z.string(),
  });

export type FacilityFormInput = z.input<ReturnType<typeof getSchema>>;
export type FacilityFormOutput = z.output<ReturnType<typeof getSchema>>;

type FormProps = FormConfigWithoutTransformFn<FacilityFormInput>;
type MyProps = {
  onCancel?: () => void;
  id: string;
};
type Props = FormProps & MyProps;

export const FacilityForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps]: [MyProps, FormProps] = splitProps(allProps, ["id", "onCancel"]);
  return (
    <FelteForm id={props.id} schema={getSchema()} {...formProps} class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <TextField name="name" type="text" onBlur={getTrimInputHandler()} />
        <TextField name="url" type="text" onBlur={getTrimInputHandler()} />
      </div>
      <FelteSubmit cancel={props.onCancel} />
    </FelteForm>
  );
};
