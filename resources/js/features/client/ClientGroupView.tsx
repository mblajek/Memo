import {Capitalize} from "components/ui/Capitalize";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {EM_DASH, EmptyValueSymbol} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {ClientGroupResource} from "data-access/memo-api/resources/clientGroup.resource";
import {For, Show, VoidComponent} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {ClientBirthDateShortInfo} from "./ClientBirthDateShortInfo";

interface Props {
  readonly group: ClientGroupResource;
  readonly currentClientId?: string;
}

export const ClientGroupView: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex flex-col gap-2 items-stretch">
      <div class="flex flex-col">
        <For each={props.group.clients} fallback={<EmptyValueSymbol />}>
          {(client) => (
            <div>
              <span class={client.userId === props.currentClientId ? "font-semibold" : undefined}>
                <UserLink userId={client.userId} type="clients" newTabLink={client.userId !== props.currentClientId} />
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
      </div>
      <div class="flex flex-col">
        <StandaloneFieldLabel>
          <Capitalize text={t("models.generic.notes")} />
        </StandaloneFieldLabel>
        <div>{props.group.notes || <EmptyValueSymbol />} </div>
      </div>
    </div>
  );
};
