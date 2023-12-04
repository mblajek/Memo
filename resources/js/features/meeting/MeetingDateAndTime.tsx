import {Button} from "components/ui/Button";
import {FieldBox} from "components/ui/form/FieldBox";
import {EN_DASH} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {DayMinuteRange, dayMinuteToTimeInput} from "components/utils/day_minute_util";
import {For, Show, VoidComponent, createMemo} from "solid-js";
import {createMeetingTimeController} from "./meeting_time_controller";

interface Props {
  /**
   * Specification of the suggested values for the time fields.
   * Warning: It looks like it does not work very well in chrome as of December 2023.
   */
  readonly suggestedTimes?: SuggestedTimes;
}

interface SuggestedTimes {
  readonly range: DayMinuteRange;
  readonly step: number;
}

export const MeetingDateAndTime: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {
    durationMinutes: [durationMinutes, setDurationMinutes],
    defaultDurationMinutes,
  } = createMeetingTimeController();
  const hoursList = createMemo(() => {
    if (!props.suggestedTimes) {
      return undefined;
    }
    const {
      range: [start, end],
      step,
    } = props.suggestedTimes;
    const options: string[] = [];
    for (let dayMinute = start; dayMinute <= end; dayMinute += step) {
      options.push(dayMinuteToTimeInput(dayMinute));
    }
    return {
      listId: "timeList",
      options,
    };
  });
  return (
    <>
      <FieldBox name="dateAndTime" validationMessagesForFields={["date", "startDayminute", "durationMinutes"]}>
        <div class="flex items-start gap-1">
          <div class="basis-0 grow flex items-center gap-0.5">
            <input
              id="date"
              name="date"
              type="date"
              class="basis-32 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
            />
            <input
              id="dateAndTime.startTime"
              name="dateAndTime.startTime"
              type="time"
              step={5 * 60}
              list={hoursList()?.listId}
              class="basis-24 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
            />
          </div>
          <div class="min-h-big-input flex items-center">{EN_DASH}</div>
          <div class="basis-0 grow flex flex-col gap-0.5">
            <div class="flex items-center gap-0.5">
              <input
                id="dateAndTime.endTime"
                name="dateAndTime.endTime"
                type="time"
                step={5 * 60}
                list={hoursList()?.listId}
                class="basis-24 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
              />
              <div class="basis-32">
                <Show when={durationMinutes()}>
                  <>{t("parenthesised", {text: t("calendar.units.minutes", {count: durationMinutes()})})}</>
                </Show>
              </div>
            </div>
            <Show when={defaultDurationMinutes() && defaultDurationMinutes() !== durationMinutes()}>
              <Button
                class="secondarySmall"
                onClick={() => setDurationMinutes(defaultDurationMinutes())}
                title={t("actions.set")}
              >
                {t("forms.meeting.default_duration", {
                  text: t("calendar.units.minutes", {count: defaultDurationMinutes()}),
                })}
              </Button>
            </Show>
          </div>
        </div>
      </FieldBox>
      <Show when={hoursList()}>
        {(hoursList) => (
          <datalist id="timeList">
            <For each={hoursList().options}>{(opt) => <option value={opt} />}</For>
          </datalist>
        )}
      </Show>
    </>
  );
};
