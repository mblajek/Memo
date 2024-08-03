import {Button, EditButton} from "components/ui/Button";
import {HideableSection} from "components/ui/HideableSection";
import {TimeDuration} from "components/ui/TimeDuration";
import {CheckboxField} from "components/ui/form/CheckboxField";
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
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {For, Show, VoidComponent, createComputed, createMemo, createSignal, on} from "solid-js";
import {DateAndTimeInfo} from "./DateAndTimeInfo";
import {MeetingInSeriesInfo} from "./MeetingInSeriesInfo";
import {createMeetingTimeController, useMeetingTimeForm} from "./meeting_time_controller";

interface Props {
  /**
   * Specification of the suggested values for the time fields.
   * Warning: It looks like it does not work very well in chrome as of December 2023.
   */
  readonly suggestedTimes?: SuggestedTimes;
  readonly viewMode: boolean;
  readonly forceEditable?: boolean;
  readonly allowAllDay?: boolean;
  /** The meeting resource, for showing some of the readonly information about the meeting. */
  readonly meeting?: MeetingResource;
  /** Whether to show information about the meeting series in the view mode. Default: true. */
  readonly showSeriesInfo?: boolean;
  readonly showSeriesLink?: boolean;
}

interface SuggestedTimes {
  readonly range: DayMinuteRange;
  readonly step: number;
}

// Faster transition looks better here.
const HIDEABLE_SECTIONS_TRANSITION_TIME_MS = 50;

export const MeetingDateAndTime: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const form = useMeetingTimeForm();
  // eslint-disable-next-line solid/reactivity
  const [isForceEditable, setForceEditable] = createSignal(props.forceEditable || false);
  const {
    durationMinutes: [durationMinutes, setDurationMinutes],
    defaultDurationMinutes,
  } = createMeetingTimeController();
  const durationDifferentFromSuggestion = () =>
    durationMinutes() !== undefined &&
    defaultDurationMinutes() !== undefined &&
    durationMinutes() !== defaultDurationMinutes();
  createComputed(
    on([() => props.viewMode, () => form.data("time.startTime")], ([viewMode]) => {
      if (viewMode) {
        setForceEditable(props.forceEditable || false);
      }
      if (durationDifferentFromSuggestion() || !form.data("date") || !form.data("time.startTime")) {
        setForceEditable(true);
      }
    }),
  );
  createComputed(() => {
    if (!props.allowAllDay) {
      form.setFields("time.allDay", false);
    }
  });
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
  const showEditable = () => !props.viewMode && isForceEditable();

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
          });
        }
      }}
    />
  );

  // Delay the duration minutes displayed on the page by a fraction of a second to avoid blinking of the wrong value
  // while the hour wrapping correct is applied.
  const delayedDurationMinutes = debouncedAccessor(durationMinutes, {timeMs: 1});
  const allDay = () => form.data("time").allDay;
  const delayedAllDay = debouncedAccessor(allDay, {timeMs: 100});

  return (
    <>
      <FieldBox name="dateAndTime" umbrella validationMessagesForFields={["date", "startDayminute", "durationMinutes"]}>
        <PlaceholderField name="startDayminute" />
        <PlaceholderField name="durationMinutes" />
        <div class={cx(showEditable() ? undefined : "hidden", "flex flex-col items-stretch")}>
          <fieldset data-felte-keep-on-remove>
            <div
              // This is a grid mainly to set the correct tab order: the all day checkbox should go after the end time.
              class="grid gap-1"
              style={{"grid-template-rows": "auto auto", "grid-template-columns": `1fr ${allDay() ? "" : "auto"} 1fr`}}
            >
              <div class="flex items-center gap-0.5">
                <input
                  id="date"
                  name="date"
                  type="date"
                  class="basis-32 grow min-h-big-input border border-input-border rounded px-2 aria-invalid:border-red-400 disabled:bg-disabled"
                />
                <Show when={!allDay()}>
                  <TimeInput id="time.startTime" name="time.startTime" />
                </Show>
              </div>
              <Show when={!allDay()}>
                <div class="min-h-big-input flex items-center">{EN_DASH}</div>
              </Show>
              <div class="row-span-2 flex flex-col items-stretch">
                <HideableSection show={!allDay()} transitionTimeMs={HIDEABLE_SECTIONS_TRANSITION_TIME_MS}>
                  <div class="flex items-center gap-0.5">
                    <TimeInput id="time.endTime" name="time.endTime" disabled={allDay()} />
                    <div class="basis-32 grow">
                      <Show when={!delayedAllDay() && durationMinutes()}>
                        {t("parenthesis.open")}
                        <TimeDuration minutes={delayedDurationMinutes()!} />
                        {t("parenthesis.close")}
                      </Show>
                    </div>
                  </div>
                </HideableSection>
                <HideableSection
                  show={
                    defaultDurationMinutes() &&
                    (defaultDurationMinutes() !== durationMinutes() ||
                      (defaultDurationMinutes() === MAX_DAY_MINUTE && !allDay()))
                  }
                  // In the all day mode this does not change the height of the page, so no transition is needed.
                  transitionTimeMs={delayedAllDay() ? 0 : HIDEABLE_SECTIONS_TRANSITION_TIME_MS}
                >
                  {(show) => {
                    const canApplySuggestion = () =>
                      show() &&
                      (defaultDurationMinutes() === MAX_DAY_MINUTE || allDay() || form.data("time.startTime"));
                    return (
                      <Button
                        class={cx(allDay() ? undefined : "mt-0.5", "w-full secondary small")}
                        onClick={() => setDurationMinutes(defaultDurationMinutes(), {maxIsAllDay: true})}
                        disabled={!canApplySuggestion()}
                        title={t(
                          canApplySuggestion() ? "actions.set" : "forms.meeting.default_duration_first_set_start_time",
                        )}
                      >
                        {t("forms.meeting.default_duration")}{" "}
                        <TimeDuration minutes={defaultDurationMinutes()!} maxIsAllDay />
                      </Button>
                    );
                  }}
                </HideableSection>
              </div>
              <CheckboxField name="time.allDay" disabled={props.allowAllDay === false} />
            </div>
          </fieldset>
        </div>
        <Show when={!showEditable()}>
          <div class="flex gap-x-2 items-baseline justify-between flex-wrap">
            <div class="flex gap-2 items-baseline">
              <DateAndTimeInfo
                date={DateTime.fromISO(form.data("date"))}
                allDay={allDay()}
                startDayMinute={timeInputToDayMinute(form.data("time").startTime)}
                durationMinutes={durationMinutes()}
              />
              <Show when={!props.viewMode}>
                <EditButton class="secondary small" onClick={() => setForceEditable(true)} />
              </Show>
            </div>
            <Show when={(props.showSeriesInfo ?? true) && props.meeting}>
              {(meeting) => <MeetingInSeriesInfo meeting={meeting()} showLink={props.showSeriesLink} />}
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
