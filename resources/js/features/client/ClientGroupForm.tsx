import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {Button} from "components/ui/Button";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {TextField} from "components/ui/form/TextField";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {createFormNudge} from "components/ui/form/util";
import {actionIcons} from "components/ui/icons";
import {EmptyValueSymbol} from "components/ui/symbols";
import {NON_NULLABLE, useLangFunc} from "components/utils";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {Index, VoidComponent, createEffect, createMemo, splitProps} from "solid-js";
import {z} from "zod";
import {useAutoRelatedClients} from "../facility-users/auto_releated_clients";
import {ClientGroupBox} from "./ClientGroupBox";

const getSchema = () =>
  z.object({
    clients: z.array(
      z.object({
        userId: z.string(),
        role: z.string(),
      }),
    ),
    notes: z.string(),
  });

export type ClientGroupFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<ClientGroupFormType> {
  readonly id: string;
  readonly currentClientId?: string;
  readonly onCancel?: () => void;
}

export const ClientGroupForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "currentClientId", "onCancel"]);
  const t = useLangFunc();
  const modelQuerySpecs = useModelQuerySpecs();
  const autoRelatedClients = useAutoRelatedClients();
  return (
    <FelteForm
      id={props.id}
      translationsFormNames={[props.id, "client_group"]}
      schema={getSchema()}
      translationsModel={["client_group"]}
      class="flex flex-col gap-4 items-stretch"
      {...formProps}
    >
      {(form) => {
        createFormNudge(form, () =>
          form
            .data("clients")
            .map(({userId}) => userId)
            .join(""),
        );
        createEffect(() => {
          const clients = form.data("clients");
          if (!clients.length || clients.at(-1)!.userId) {
            form.addField("clients", {userId: "", role: ""});
          }
        });
        const priorityQueryParams = autoRelatedClients.selectParamsExtension(() =>
          // Make sure this is the same for all the client selects if there are multiple clients,
          // to avoid sending multiple additional requests.
          form
            .data("clients")
            .map(({userId}) => userId)
            .filter(NON_NULLABLE),
        );
        const currentClientIndex = createMemo(() =>
          props.currentClientId
            ? form.data("clients").findIndex(({userId}) => userId === props.currentClientId)
            : undefined,
        );
        return (
          <>
            <ClientGroupBox>
              <div class="grid gap-1" style={{"grid-template-columns": "50% 1fr auto"}}>
                <FieldLabel fieldName="client.userId" umbrella />
                <FieldLabel fieldName="client.role" umbrella />
                <Index each={form.data("clients")} fallback={<EmptyValueSymbol />}>
                  {(_client, index) => {
                    const isCurrentClient = () => index === currentClientIndex();
                    const userId = () => form.data(`clients.${index}.userId`);
                    return (
                      <>
                        <div class="col-start-1">
                          <TQuerySelect
                            name={`clients.${index}.userId`}
                            label=""
                            {...modelQuerySpecs.userClient({showBirthDateWhenSelected: true})}
                            {...priorityQueryParams()}
                            nullable={false}
                            small
                            disabled={isCurrentClient()}
                          />
                        </div>
                        <span inert={userId() ? undefined : true}>
                          <TextField
                            class="h-full"
                            name={`clients.${index}.role`}
                            label=""
                            small
                            placeholder={t("forms.generic.optional_field_hint")}
                          />
                        </span>
                        <Button
                          class="secondary small !min-h-small-input h-full"
                          title={
                            isCurrentClient()
                              ? t("facility_user.client_groups.first_client_frozen")
                              : userId()
                                ? t("actions.delete")
                                : undefined
                          }
                          onClick={() => form.setFields("clients", form.data("clients").toSpliced(index, 1))}
                          disabled={!userId() || isCurrentClient()}
                        >
                          <actionIcons.Delete class="inlineIcon" />
                        </Button>
                      </>
                    );
                  }}
                </Index>
              </div>
              <TextField name="notes" />
            </ClientGroupBox>
            <FelteSubmit disabled={!form.data("clients").some(({userId}) => userId)} cancel={props.onCancel} />
          </>
        );
      }}
    </FelteForm>
  );
};

export function clientGroupInitialValuesForEdit(group: ClientGroupResource) {
  return (
    group &&
    ({
      clients: group.clients.map(({userId, role}) => ({userId, role: role || ""})),
      notes: group.notes || "",
    } satisfies ClientGroupFormType)
  );
}

export function clientGroupInitialValuesForCreate() {
  return {
    clients: [],
    notes: "",
  } satisfies ClientGroupFormType;
}

export function transformFormValues(values: Partial<ClientGroupFormType>) {
  return {
    clients: values.clients?.filter(({userId}) => userId) || [],
    notes: values.notes || null,
  } satisfies Partial<ClientGroupResource>;
}
