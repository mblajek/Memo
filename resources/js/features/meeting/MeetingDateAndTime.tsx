import {Button, EditButton} from "components/ui/Button";
import {HideableSection} from "components/ui/HideableSection";
import {TimeDuration} from "components/ui/TimeDuration";
import {FieldBox} from "components/ui/form/FieldBox";
import {PlaceholderField} from "components/ui/form/PlaceholderField";
import {EN_DASH} from "components/ui/symbols";
import {cx, debouncedAccessor, htmlAttributes, useLangFunc} from "components/utils";
import {
  DayMinuteRange,
  MAX_DAY_MINUTE,
  dayMinuteToTimeInput,
  timeInputToDayMinute,
} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {For, Show, VoidComponent, createComputed, createMemo, createSignal, on} from "solid-js";
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
  const {
    durationMinutes: [durationMinutes, setDurationMinutes],
    defaultDurationMinutes,
  } = createMeetingTimeController();
  const durationDifferentFromSuggestion = () =>
    durationMinutes() !== undefined &&
    defaultDurationMinutes() !== undefined &&
    durationMinutes() !== defaultDurationMinutes();
  createComputed(
    on([() => props.viewMode, () => form.data("time.startTime")], (viewMode, _startTime) => {
      if (viewMode) {
        setForceEditable(false);
      }
      if (durationDifferentFromSuggestion()) {
        setForceEditable(true);
      }
    }),
  );
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
    (isForceEditable() || !form.data("date") || !form.data("time.startTime") || durationDifferentFromSuggestion());

  const STEP_MINUTES = 5;
  const KEY_DIRS = new Map([
    ["ArrowUp", 1],
    ["ArrowDown", -1],
  ]);
  const TimeInput: VoidComponent<htmlAttributes.input> = (props) => (
    <input
      {...props}
      type="time"
      step={STEP_MINUTES * 60}
      list={hoursList()?.listId}
      class="basis-24 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
      onKeyDown={({key, target}) => {
        const dir = KEY_DIRS.get(key);
        if (dir) {
          // Fix the UX problem that normally pressing up/down on minute field wraps without changing the hour field.
          const input = target as HTMLInputElement;
          if (!input.value) {
            return;
          }
          const dayMinuteBefore = timeInputToDayMinute(input.value, {assert: true});
          setTimeout(() => {
            const dayMinuteAfter = timeInputToDayMinute(input.value, {assert: true});
            const delta =
              ((dayMinuteAfter - dayMinuteBefore + MAX_DAY_MINUTE / 2) % MAX_DAY_MINUTE) - MAX_DAY_MINUTE / 2;
            if (delta % 60 !== 0) {
              // Probably on minute field.
              const expectedDelta = STEP_MINUTES * dir;
              if (delta === expectedDelta - 60 * dir) {
                // Set the value in the form. Setting it directly on the input doesn't update the value in the form.
                form.setFields(
                  input.name,
                  dayMinuteToTimeInput((dayMinuteBefore + expectedDelta + MAX_DAY_MINUTE) % MAX_DAY_MINUTE),
                );
              }
            }
          }, 0);
        }
      }}
    />
  );

  // Delay the duration minutes displayed on the page by a fraction of a second to avoid blinking of the wrong value
  // while the hour wrapping correct is applied.
  const delayedDurationMinutes = debouncedAccessor(durationMinutes, {timeMs: 10});

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
            <TimeInput id="time.startTime" name="time.startTime" />
          </div>
          <div class="min-h-big-input flex items-center">{EN_DASH}</div>
          <div class="basis-0 grow flex flex-col items-stretch gap-0.5">
            <div class="flex items-center gap-0.5">
              <TimeInput id="time.endTime" name="time.endTime" />
              <div class="basis-32 grow">
                <Show when={durationMinutes()}>
                  {t("parenthesis.open")}
                  <TimeDuration minutes={delayedDurationMinutes()!} />
                  {t("parenthesis.close")}
                </Show>
              </div>
            </div>
            <HideableSection
              show={
                defaultDurationMinutes() &&
                defaultDurationMinutes() !== durationMinutes() &&
                form.data("time").startTime
              }
            >
              <Button
                class="w-full secondary small"
                onClick={() => setDurationMinutes(defaultDurationMinutes())}
                title={t("actions.set")}
              >
                {t("forms.meeting.default_duration")} <TimeDuration minutes={defaultDurationMinutes()!} />
              </Button>
            </HideableSection>
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
