import {Capitalize} from "components/ui/Capitalize";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {EM_DASH, EmptyValueSymbol} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {For, Show, VoidComponent} from "solid-js";
import {CreatedByInfo} from "../facility-users/CreatedByInfo";
import {UserLink} from "../facility-users/UserLink";
import {ClientBirthDateShortInfo} from "./ClientBirthDateShortInfo";

export interface ClientGroupViewProps {
  readonly group: ClientGroupResource;
  readonly currentClientId?: string;
}

export const ClientGroupView: VoidComponent<ClientGroupViewProps> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex flex-col gap-2 items-stretch">
      <div class="flex gap-4 justify-between">
        <div class="flex flex-col">
          <For each={props.group.clients} fallback={<EmptyValueSymbol />}>
            {(client) => (
              <div>
                <span class={client.userId === props.currentClientId ? "font-semibold" : undefined}>
                  <UserLink
                    userId={client.userId}
                    type="clients"
                    newTabLink={client.userId !== props.currentClientId}
                  />
                </span>
                <ClientBirthDateShortInfo
                  clientId={client.userId}
                  wrapIn={(content) => (
                    <span class="text-grey-text">
                      {" "}
                      {t("parenthesis.open")}
                      {content}
                      {t("parenthesis.close")}
                    </span>
                  )}
                />
                <Show when={client.role}>
                  {" "}
                  <span class="text-grey-text">{EM_DASH}</span> {client.role}
                </Show>
              </div>
            )}
          </For>
          <div class="text-grey-text">
            {t("parenthesised", {
              text: t("facility_user.client_groups.clients_count", {count: props.group.clients.length}),
            })}
          </div>
        </div>
        <CreatedByInfo data={props.group} />
      </div>
      <div class="flex flex-col">
        <StandaloneFieldLabel>
          <Capitalize text={t("models.generic.notes")} />
        </StandaloneFieldLabel>
        <div class="wrapText">{props.group.notes || <EmptyValueSymbol />} </div>
      </div>
    </div>
  );
};
