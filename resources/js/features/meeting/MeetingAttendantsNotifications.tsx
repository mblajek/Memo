import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {ButtonLike} from "components/ui/ButtonLike";
import {Capitalize} from "components/ui/Capitalize";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {actionIcons} from "components/ui/icons";
import {style} from "components/ui/inline_styles";
import {PopOver} from "components/ui/PopOver";
import {title} from "components/ui/title";
import {WarningMark} from "components/ui/WarningMark";
import {cx} from "components/utils/classnames";
import {isDEV} from "components/utils/dev_mode";
import {useLangFunc} from "components/utils/lang";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {MeetingFormType} from "features/meeting/MeetingForm";
import {NotificationStatusIndicator} from "features/meeting/NotificationStatusIndicator";
import {AiFillCaretDown} from "solid-icons/ai";
import {FaSolidAsterisk, FaSolidCircleCheck, FaSolidCircleXmark} from "solid-icons/fa";
import {createEffect, createMemo, For, Show, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";
import {UserLink} from "../facility-users/UserLink";
import {useMeetingAttendantsClients} from "./meeting_attendants_clients";

type _Directives = typeof title;

interface Props {
  readonly viewMode: boolean;
}

export const MeetingAttendantsNotifications: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const facility = useActiveFacility();
  const {form} = useFormContext<MeetingFormType>();
  const {notificationMethodDict} = useFixedDictionaries();
  const {translations} = useFormContext();
  const {meetingClients, selectedClientsDataQuery, selectedClients} = useMeetingAttendantsClients();
  createEffect(() => {
    meetingClients().forEach(({userId, notifications}, index) => {
      if (!notifications) {
        const client = selectedClients().find(({id}) => id === userId);
        if (client) {
          form.setData(
            `clients.${index}.notifications`,
            client.notificationMethods.map((notificationMethodDictId) => ({notificationMethodDictId})),
          );
        }
      }
    });
  });
  return (
    <Show when={(facility()?.hasMeetingNotification || isDEV()) && (meetingClients().length || !props.viewMode)}>
      <div class="flex gap-2 justify-between items-center">
        <PopOver
          trigger={(popOver) => (
            <ButtonLike
              class="secondary small flex gap-1 items-center"
              onClick={popOver.open}
              disabled={!meetingClients().length}
            >
              <Show
                when={
                  !meetingClients().length ||
                  meetingClients().some(({notifications}) => !notifications || notifications?.length)
                }
                fallback={<actionIcons.NotifyOff class="text-current" />}
              >
                <actionIcons.Notify class="text-current" />
              </Show>
              <Capitalize text={translations.fieldName("notifications")} />
              <AiFillCaretDown class="text-current" />
            </ButtonLike>
          )}
          placement={{placement: "bottom-start"}}
        >
          <QueryBarrier queries={[selectedClientsDataQuery]}>
            <div
              class="px-2 py-1 grid gap-x-1 gap-y-0.5 min-w-80"
              {...style({"grid-template-columns": "auto auto auto"})}
            >
              <div />
              <StandaloneFieldLabel class="flex flex-col items-center">
                {notificationMethodDict()?.sms.label}
              </StandaloneFieldLabel>
              <For each={meetingClients()}>
                {(meetingClient, index) => {
                  const client = createMemo(() => selectedClients()?.find(({id}) => id === meetingClient.userId));
                  const notification = () =>
                    notificationMethodDict()
                      ? meetingClient.notifications?.find(
                          (n) => n.notificationMethodDictId === notificationMethodDict()!.sms.id,
                        )
                      : undefined;
                  const clientHasNotificationMethod = () =>
                    notificationMethodDict() && client()
                      ? client()!.notificationMethods.includes(notificationMethodDict()!.sms.id)
                      : undefined;
                  return (
                    <>
                      <div class="col-start-1 me-4">
                        <UserLink type="clients" userId={meetingClient.userId} />
                      </div>
                      <Button
                        class={cx(
                          "mx-auto flex items-center justify-center w-14 h-6",
                          props.viewMode ? undefined : "minimal",
                        )}
                        onClick={() => {
                          const notifications =
                            meetingClient.notifications?.filter(
                              (n) => n.notificationMethodDictId !== notificationMethodDict()!.sms.id,
                            ) || [];
                          if (!notification()) {
                            notifications.push({notificationMethodDictId: notificationMethodDict()!.sms.id});
                          }
                          form.setData(`clients.${index()}.notifications`, notifications);
                        }}
                        disabled={props.viewMode}
                        aria-checked={!!notification()}
                      >
                        <Show when={clientHasNotificationMethod() === !notification()}>
                          <div class="w-0 relative right-3">
                            <div class="w-3" use:title={t("meetings.notification_methods.non_standard")}>
                              <FaSolidAsterisk class="inline-block mb-2 text-gray-600" size="12" />
                            </div>
                          </div>
                        </Show>
                        <Show
                          when={notification()}
                          fallback={<FaSolidCircleXmark class="text-black text-opacity-30 scale-75" />}
                        >
                          <FaSolidCircleCheck class="text-memo-active" />
                          <Show when={client() && !client()!.contactPhone}>
                            <div class="w-0 relative left-0.5">
                              <div
                                class="w-3"
                                use:title={t("facility_user.client.notification_method_requires_contact_data")}
                              >
                                <WarningMark />
                              </div>
                            </div>
                          </Show>
                        </Show>
                      </Button>
                      <Show when={props.viewMode}>
                        <NotificationStatusIndicator notification={notification()} />
                      </Show>
                    </>
                  );
                }}
              </For>
            </div>
            <Show when={props.viewMode}>
              <div class="p-2 min-w-full max-w-0">
                <div class="text-grey-text wrapText">{t("meetings.notification_methods.edit_meeting_to_modify")}</div>
              </div>
            </Show>
          </QueryBarrier>
        </PopOver>
      </div>
    </Show>
  );
};
