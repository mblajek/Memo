import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {Button} from "components/ui/Button";
import {FieldLabel} from "components/ui/form/FieldLabel";
import {TextField} from "components/ui/form/TextField";
import {TQuerySelect} from "components/ui/form/TQuerySelect";
import {actionIcons} from "components/ui/icons";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {EmptyValueSymbol} from "components/ui/symbols";
import {cx, NON_NULLABLE, useLangFunc} from "components/utils";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {AiFillCaretDown} from "solid-icons/ai";
import {createEffect, createMemo, For, Index, Match, on, splitProps, Switch, VoidComponent} from "solid-js";
import {z} from "zod";
import {useAutoRelatedClients} from "../facility-users/auto_releated_clients";
import {ClientGroupBox} from "./ClientGroupBox";
import {useClientsData} from "./clients_data";

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
  const dictionaries = useDictionaries();
  const {clientTypeDict} = useFixedDictionaries();
  const modelQuerySpecs = useModelQuerySpecs();
  const autoRelatedClients = useAutoRelatedClients();
  const clientsData = useClientsData();
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
        createEffect(
          on(
            [
              () => form.data("clients"),
              form.data, // to nudge the form and improve reactivity
            ],
            ([clients]) => {
              if (!clients.length || clients.at(-1)!.userId) {
                form.addField("clients", {userId: "", role: ""});
              }
            },
          ),
        );
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
        if (props.currentClientId) {
          setTimeout(() => {
            const focusIndex = form.data("clients").findIndex(({userId}) => userId === props.currentClientId);
            if (focusIndex >= 0) {
              document.getElementById(`clients.${focusIndex}.role`)?.focus();
            }
          });
        }
        return (
          <>
            <ClientGroupBox>
              <div class="grid gap-1" style={{"grid-template-columns": "2fr 1fr auto"}}>
                <FieldLabel fieldName="client.userId" umbrella />
                <FieldLabel fieldName="client.role" umbrella />
                <Index each={form.data("clients")} fallback={<EmptyValueSymbol />}>
                  {(_client, index) => {
                    const isCurrentClient = () => index === currentClientIndex();
                    const userId = () => form.data(`clients.${index}.userId`);
                    const isChild = () =>
                      userId() && clientsData.getById(userId()!)?.type.id === clientTypeDict()?.child.id;
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
                        <div>
                          <div
                            class={cx("flex items-stretch min-w-0", userId() ? undefined : "opacity-40")}
                            bool:inert={!userId()}
                          >
                            <div class="flex-grow">
                              <TextField
                                class="w-full rounded-e-none"
                                autocapitalize="off"
                                name={`clients.${index}.role`}
                                label=""
                                small
                                placeholder={isChild() ? clientTypeDict()?.child.label : undefined}
                              />
                            </div>
                            <PopOver
                              trigger={(popOver) => (
                                <Button
                                  class="secondary small !min-h-small-input !px-0.5 !rounded-s-none -ml-px"
                                  onClick={popOver.open}
                                >
                                  <AiFillCaretDown class="text-current" />
                                </Button>
                              )}
                            >
                              {(popOver) => (
                                <SimpleMenu onClick={() => popOver.close()}>
                                  <Switch>
                                    <Match when={isChild()}>
                                      <Button onClick={() => form.setFields(`clients.${index}.role`, "")}>
                                        <span class="text-grey-text">{clientTypeDict()?.child.label}</span>
                                      </Button>
                                    </Match>
                                    <Match when="not child">
                                      <Button onClick={() => form.setFields(`clients.${index}.role`, "")}>
                                        <span class="text-grey-text">
                                          {t("facility_user.client_groups.role_preset_empty")}
                                        </span>
                                      </Button>
                                      <For
                                        each={dictionaries()
                                          ?.get("clientGroupClientRole")
                                          .activePositions.map(({label}) => label)}
                                      >
                                        {(preset) => (
                                          <Button onClick={() => form.setFields(`clients.${index}.role`, preset)}>
                                            {preset}
                                          </Button>
                                        )}
                                      </For>
                                    </Match>
                                  </Switch>
                                </SimpleMenu>
                              )}
                            </PopOver>
                          </div>
                        </div>
                        <Button
                          class="secondary small !min-h-small-input"
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
  return {
    clients: group.clients.map(({userId, role}) => ({userId, role: role || ""})),
    notes: group.notes || "",
  } satisfies ClientGroupFormType;
}

export function clientGroupInitialValuesForCreate(clientIds: string[] = []) {
  return {
    clients: clientIds.map((userId) => ({userId, role: ""})),
    notes: "",
  } satisfies ClientGroupFormType;
}

export function transformFormValues(values: Partial<ClientGroupFormType>) {
  return {
    clients: values.clients?.filter(({userId}) => userId) || [],
    notes: values.notes || null,
  } satisfies Partial<ClientGroupResource>;
}
