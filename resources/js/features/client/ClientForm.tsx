import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {ATTRIBUTES_SCHEMA, AttributeFields} from "components/ui/form/AttributeFields";
import {TextField} from "components/ui/form/TextField";
import {useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {Show, VoidComponent, createSignal, splitProps} from "solid-js";
import {z} from "zod";

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
  const t = useLangFunc();
  const [showAllAttributes, setShowAllAttributes] = createSignal(false);
  return (
    <FelteForm
      id={props.id}
      translationsFormNames={[props.id, "client", "facility_user"]}
      schema={getSchema()}
      translationsModel="client"
      class="flex flex-col gap-2 items-stretch"
      {...formProps}
    >
      <TextField name="name" autofocus />
      <div class="flex flex-col gap-1 items-stretch border border-gray-300 rounded-md p-1">
        <Show when={isDEV()}>
          <label class="flex items-baseline gap-1">
            <input
              type="checkbox"
              name="showAllAttributes"
              class="m-px outline-1"
              checked={showAllAttributes()}
              onInput={() => setShowAllAttributes((v) => !v)}
            />
            <span>
              <span class="text-xs">DEV</span> {t("attributes.show_all")}
            </span>
          </label>
        </Show>
        <AttributeFields
          model="client"
          minRequirementLevel={showAllAttributes() ? undefined : "optional"}
          nestFieldsUnder="client"
        />
      </div>
      <FelteSubmit cancel={props.onCancel} />
    </FelteForm>
  );
};
