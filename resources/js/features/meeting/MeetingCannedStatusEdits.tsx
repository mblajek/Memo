import {useFormContext} from "components/felte-form/FelteForm";
import {Button} from "components/ui/Button";
import {ButtonLike} from "components/ui/ButtonLike";
import {PopOver} from "components/ui/PopOver";
import {SimpleMenu} from "components/ui/SimpleMenu";
import {CLIENT_ICONS, STAFF_ICONS} from "components/ui/icons";
import {currentTimeMinute, cx, htmlAttributes, useLangFunc} from "components/utils";
import {Position} from "data-access/memo-api/dictionaries";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {AiFillCaretDown} from "solid-icons/ai";
import {Show, VoidComponent} from "solid-js";
import {MeetingFormType} from "./MeetingForm";
import {getMeetingTimeFullData} from "./meeting_time_controller";

interface Props {
  readonly onViewModeChange: (viewMode: boolean) => void;
}

export const MeetingCannedStatusEdits: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  const {form, formConfig} = useFormContext<MeetingFormType>();

  function shouldSubmitCancelImmediately(type: FacilityUserType) {
    const data = form.data(type);
    return data.length === 1 && data[0]?.attendanceStatusDictId === attendanceStatusDict()?.ok.id;
  }

  /** Submits the form, sending just the specified fields (if specified). */
  function submitForm(fields?: (keyof MeetingFormType)[]) {
    form.createSubmitHandler({
      onSubmit: (values, context) => {
        let selectedValues: Partial<MeetingFormType>;
        if (fields) {
          selectedValues = {};
          for (const field of fields) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            selectedValues[field] = values[field] as any;
          }
        } else {
          selectedValues = values;
        }
        // The cast here is necessary to trick the form into accepting partial data. This might not
        // be very elegant, but is simplest for patch, if we want to reuse the form for both create
        // and update.
        return formConfig.onSubmit?.(selectedValues as MeetingFormType, context);
      },
    })();
  }

  function cancelBy(type: FacilityUserType, attendanceStatus: Position) {
    const submitImmediately = shouldSubmitCancelImmediately(type);
    form.setFields("statusDictId", meetingStatusDict()!.cancelled.id);
    const data = form.data(type);
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.userId && data[i]?.attendanceStatusDictId === attendanceStatusDict()!.ok.id)
        form.setFields(`${type}.${i}.attendanceStatusDictId`, attendanceStatus.id);
    }
    if (submitImmediately) {
      submitForm(["statusDictId", type]);
    } else {
      props.onViewModeChange(false);
    }
  }

  const hasBegun = () => {
    const meetingInterval = getMeetingTimeFullData(form.data()).interval;
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
            class="flex-grow flex items-center justify-center secondary small select-none"
            disabled={form.isSubmitting()}
          >
            {t("meetings.mark_as_cancelled.text")} <AiFillCaretDown class="text-current" />
          </ButtonLike>
        )}
      >
        {(popOver) => (
          <SimpleMenu onClick={() => popOver().close()}>
            <Show when={form.data("staff").some(({userId}) => userId)}>
              <Button onClick={() => cancelBy("staff", attendanceStatusDict()!.cancelled)}>
                <STAFF_ICONS.staff class="inlineIcon" /> {t("meetings.mark_as_cancelled.by_staff")}
                <Show when={!shouldSubmitCancelImmediately("staff")}>{t("ellipsis")}</Show>
              </Button>
            </Show>
            <Show when={form.data("clients").some(({userId}) => userId)}>
              <Button onClick={() => cancelBy("clients", attendanceStatusDict()!.cancelled)}>
                <CLIENT_ICONS.client class="inlineIcon" /> {t("meetings.mark_as_cancelled.by_client")}
                <Show when={!shouldSubmitCancelImmediately("clients")}>{t("ellipsis")}</Show>
              </Button>
            </Show>
            <Show when={hasBegun() && form.data("clients").some(({userId}) => userId)}>
              <Button onClick={() => cancelBy("clients", attendanceStatusDict()!.no_show)}>
                <CLIENT_ICONS.client class="inlineIcon" /> {t("meetings.mark_as_cancelled.by_client_no_show")}
                <Show when={!shouldSubmitCancelImmediately("clients")}>{t("ellipsis")}</Show>
              </Button>
            </Show>
            <Button
              onClick={() => {
                form.setFields("statusDictId", meetingStatusDict()!.cancelled.id);
                props.onViewModeChange(false);
              }}
            >
              {t("meetings.mark_as_cancelled.other")}
              {t("ellipsis")}
            </Button>
            <Button
              onClick={() => {
                form.setFields("statusDictId", meetingStatusDict()!.cancelled.id);
                submitForm(["statusDictId"]);
              }}
            >
              {t("meetings.mark_as_cancelled.undetermined")}
            </Button>
          </SimpleMenu>
        )}
      </PopOver>
      <ButtonLike
        class={cx(
          "flex-grow-[8] flex items-center justify-center small select-none",
          hasBegun() ? "primary" : "secondary",
        )}
        onClick={() => {
          form.setFields("statusDictId", meetingStatusDict()!.completed.id);
          submitForm(["statusDictId"]);
        }}
        disabled={form.isSubmitting()}
      >
        {t("meetings.mark_as_completed")}
      </ButtonLike>
    </div>
  );
};
