import {Button, EditButton} from "components/ui/Button";
import {FieldBox} from "components/ui/form/FieldBox";
import {PlaceholderField} from "components/ui/form/PlaceholderField";
import {EN_DASH} from "components/ui/symbols";
import {cx, useLangFunc} from "components/utils";
import {DayMinuteRange, dayMinuteToTimeInput, timeInputToDayMinute} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {For, Show, VoidComponent, createComputed, createMemo, createSignal} from "solid-js";
import {DateAndTimeInfo} from "./DateAndTimeInfo";
import {createMeetingTimeController, useMeetingTimeForm} from "./meeting_time_controller";

interface Props {
  /**
   * Specification of the suggested values for the time fields.
   * Warning: It looks like it does not work very well in chrome as of December 2023.
   */
  readonly suggestedTimes?: SuggestedTimes;
  readonly viewMode?: boolean;
}

interface SuggestedTimes {
  readonly range: DayMinuteRange;
  readonly step: number;
}

export const MeetingDateAndTime: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const form = useMeetingTimeForm();
  const [isForceEditable, setForceEditable] = createSignal(false);
  createComputed(() => {
    if (!props.viewMode) {
      setForceEditable(false);
    }
  });
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
  const showEditable = () =>
    !props.viewMode &&
    (isForceEditable() ||
      !form.data("date") ||
      !form.data("time.startTime") ||
      (form.data("typeDictId") && durationMinutes() !== defaultDurationMinutes()));
  return (
    <>
      <FieldBox name="dateAndTime" umbrella validationMessagesForFields={["date", "startDayminute", "durationMinutes"]}>
        <PlaceholderField name="startDayminute" />
        <PlaceholderField name="durationMinutes" />
        <div class={cx("flex items-start gap-1", {hidden: !showEditable()})}>
          <div class="basis-0 grow flex items-center gap-0.5">
            <input
              id="date"
              name="date"
              type="date"
              class="basis-32 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
            />
            <input
              id="time.startTime"
              name="time.startTime"
              type="time"
              step={5 * 60}
              list={hoursList()?.listId}
              class="basis-24 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
            />
          </div>
          <div class="min-h-big-input flex items-center">{EN_DASH}</div>
          <div class="basis-0 grow flex flex-col items-stretch gap-0.5">
            <div class="flex items-center gap-0.5">
              <input
                id="time.endTime"
                name="time.endTime"
                type="time"
                step={5 * 60}
                list={hoursList()?.listId}
                class="basis-24 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
              />
              <div class="basis-32 grow">
                <Show when={durationMinutes()}>
                  <>{t("parenthesised", {text: t("calendar.units.minutes", {count: durationMinutes()})})}</>
                </Show>
              </div>
            </div>
            <Show
              when={
                defaultDurationMinutes() &&
                defaultDurationMinutes() !== durationMinutes() &&
                form.data("time").startTime
              }
            >
              <Button
                class="secondary small"
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
        <Show when={!showEditable()}>
          <div class="flex gap-2 items-baseline">
            <DateAndTimeInfo
              date={DateTime.fromISO(form.data("date"))}
              startDayMinute={timeInputToDayMinute(form.data("time").startTime, {assert: true})}
              durationMinutes={durationMinutes()}
            />
            <Show when={!props.viewMode}>
              <EditButton class="secondary small" onClick={() => setForceEditable(true)} />
            </Show>
          </div>
        </Show>
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
