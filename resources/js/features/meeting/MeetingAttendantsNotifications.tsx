import {useFormContext} from "components/felte-form/FelteForm";
import {ButtonLike} from "components/ui/ButtonLike";
import {Capitalize} from "components/ui/Capitalize";
import {FieldLabel, StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {actionIcons} from "components/ui/icons";
import {PopOver} from "components/ui/PopOver";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {AiFillCaretDown} from "solid-icons/ai";
import {FaSolidCircleCheck, FaSolidCircleXmark} from "solid-icons/fa";
import {For, Show, VoidComponent} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {useMeetingAttendantsClients} from "./meeting_attendants_clients";
import {useLangFunc} from "components/utils/lang";
import {QueryBarrier} from "components/utils/QueryBarrier";

type _Directives = typeof title;

interface Props {
  readonly viewMode: boolean;
}

export const MeetingAttendantsNotifications: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {notificationMethodDict} = useFixedDictionaries();
  const {translations} = useFormContext();
  const {selectedClientIds, selectedClientsDataQuery, selectedClients} = useMeetingAttendantsClients();
  return (
    <Show when={selectedClientIds().length || !props.viewMode}>
      <div class="flex gap-2 justify-between items-center">
        <PopOver
          trigger={(popOver) => (
            <ButtonLike
              class="secondary small flex gap-1 items-center"
              onClick={() => popOver.open()}
              disabled={!selectedClientIds().length}
            >
              <actionIcons.Notify class="text-current" />
              <Capitalize text={translations.fieldName("notifications")} />
              <AiFillCaretDown class="text-current" />
            </ButtonLike>
          )}
          placement={{placement: "bottom-start"}}
        >
          <QueryBarrier queries={[selectedClientsDataQuery]}>
            <div class="px-2 py-1 grid gap-x-4" style={{"grid-template-columns": "auto auto"}}>
              <FieldLabel fieldName="notifications" umbrella />
              <StandaloneFieldLabel class="flex flex-col items-center">
                {notificationMethodDict()?.sms.label}
              </StandaloneFieldLabel>
              <For each={selectedClients()}>
                {(client) => (
                  <>
                    <div class="col-start-1">
                      <UserLink type="clients" userId={client.id} />
                    </div>
                    <div class="flex items-center justify-center px-4">
                      <Show
                        when={client.notificationMethods.includes(notificationMethodDict()?.sms.id || "")}
                        fallback={<FaSolidCircleXmark class="text-black text-opacity-30" />}
                      >
                        <FaSolidCircleCheck class="text-memo-active" />
                        <Show when={!client.contactPhone}>
                          <div
                            class="w-0 relative left-0.5"
                            use:title={t("facility_user.client.notification_method_requires_contact_data")}
                          >
                            <WarningMark />
                          </div>
                        </Show>
                      </Show>
                    </div>
                  </>
                )}
              </For>
            </div>
          </QueryBarrier>
        </PopOver>
      </div>
    </Show>
  );
};
