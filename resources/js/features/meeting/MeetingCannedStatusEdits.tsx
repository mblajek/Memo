import {useFormContext} from "components/felte-form/FelteForm";
import {ButtonLike} from "components/ui/ButtonLike";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {NON_NULLABLE, currentTimeMinute, cx, htmlAttributes, useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {AiFillCaretDown} from "solid-icons/ai";
import {Show, VoidComponent} from "solid-js";
import {MeetingFormType} from "./MeetingForm";
import {getMeetingTimeInterval} from "./meeting_time_controller";

interface Props {
  readonly onViewModeChange: (viewMode: boolean) => void;
}

export const MeetingCannedStatusEdits: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const {form} = useFormContext<MeetingFormType>();
  const attendanceStatusOK = () => dictionaries()!.get("attendanceStatus").get("ok").id;

  function shouldSubmitCancelImmediately(type: FacilityUserType) {
    const data = form.data(type);
    return data.length === 1 && data[0]?.attendanceStatusDictId === attendanceStatusOK();
  }

  function cancelBy(type: FacilityUserType) {
    const submitImmediately = shouldSubmitCancelImmediately(type);
    form.setFields("statusDictId", dictionaries()!.get("meetingStatus").get("cancelled").id);
    const data = form.data(type);
    const attendanceStatusCancelled = dictionaries()!.get("attendanceStatus").get("cancelled").id;
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.userId && data[i]?.attendanceStatusDictId === attendanceStatusOK())
        form.setFields(`${type}.${i}.attendanceStatusDictId`, attendanceStatusCancelled);
    }
    if (submitImmediately) {
      form.handleSubmit();
    } else {
      props.onViewModeChange(false);
    }
  }

  const hasBegun = () => {
    const meetingInterval = getMeetingTimeInterval(form.data());
    return meetingInterval && meetingInterval.start.toMillis() <= currentTimeMinute().toMillis();
  };

  // Use ButtonLikes and not Buttons, because this component might appear in a disabled form,
  // and they still need to be enabled.
  return (
    <div class="flex gap-1">
      <PopOver
        trigger={(triggerProps) => (
          <ButtonLike
            {...(triggerProps() as htmlAttributes.div)}
            class="flex-grow flex items-center justify-center secondary small"
            disabled={form.isSubmitting()}
          >
            {t("meetings.mark_as_cancelled.text")} <AiFillCaretDown class="text-current" />
          </ButtonLike>
        )}
      >
        {(popOver) => (
          <SimpleMenu
            items={[
              form.data("staff").some(({userId}) => userId)
                ? {
                    label: (
                      <div>
                        <STAFF_ICONS.staff class="inlineIcon" /> {t("meetings.mark_as_cancelled.by_staff")}
                        <Show when={!shouldSubmitCancelImmediately("staff")}>{t("ellipsis")}</Show>
                      </div>
                    ),
                    onClick: () => cancelBy("staff"),
                  }
                : undefined,
              form.data("clients").some(({userId}) => userId)
                ? {
                    label: (
                      <div>
                        <CLIENT_ICONS.client class="inlineIcon" /> {t("meetings.mark_as_cancelled.by_client")}
                        <Show when={!shouldSubmitCancelImmediately("clients")}>{t("ellipsis")}</Show>
                      </div>
                    ),
                    onClick: () => cancelBy("clients"),
                  }
                : undefined,
              {
                label: t("meetings.mark_as_cancelled.undetermined"),
                onClick: () => {
                  form.setFields("statusDictId", dictionaries()!.get("meetingStatus").get("cancelled").id);
                  form.handleSubmit();
                },
              },
            ].filter(NON_NULLABLE)}
            onClick={() => popOver().close()}
          />
        )}
      </PopOver>
      <ButtonLike
        class={cx("flex-grow-[8] flex items-center justify-center small", hasBegun() ? "primary" : "secondary")}
        onClick={() => {
          form.setFields("statusDictId", dictionaries()!.get("meetingStatus").get("completed").id);
          form.handleSubmit();
        }}
        disabled={form.isSubmitting()}
      >
        {t("meetings.mark_as_completed")}
      </ButtonLike>
    </div>
  );
};
