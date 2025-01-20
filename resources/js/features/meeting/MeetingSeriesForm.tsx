import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm, FormProps, useFormContext} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {useHolidays} from "components/ui/calendar/holidays";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {FieldBox} from "components/ui/form/FieldBox";
import {RangeField} from "components/ui/form/RangeField";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {cx} from "components/utils/classnames";
import {FormattedDateTime} from "components/utils/date_formatting";
import {DATE_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {DateTime} from "luxon";
import {For, Show, VoidComponent, createComputed, createMemo, createSignal, on, onMount, splitProps} from "solid-js";
import {z} from "zod";
import s from "./MeetingSeriesForm.module.scss";
import {MeetingWithExtraInfo} from "./meeting_api";

export const getMeetingSeriesSchema = () =>
  z.object({
    // The real type is FacilityMeeting.CloneInterval.
    seriesInterval: z.string(),
    // Float between 0 and 1, scaled non-linearly to the number of meetings, so that the slider is more accurate
    // closer to the start of the range.
    seriesLength: z.number(),
    seriesIncludeDate: z.record(z.boolean()),
  });

export type MeetingSeriesFormType = z.infer<ReturnType<typeof getMeetingSeriesSchema>>;

interface Props
  extends FormConfigWithoutTransformFn<MeetingSeriesFormType>,
    Pick<FormProps, "id" | "translationsFormNames"> {
  readonly startMeeting: MeetingWithExtraInfo;
  readonly onCancel?: () => void;
}

const INTERVALS: FacilityMeeting.CloneInterval[] = ["1d", "7d", "14d"];

const MAX_NUM_MEETINGS = 100;

export const MeetingSeriesForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["locale", "startMeeting", "onCancel"]);
  return (
    <FelteForm schema={getMeetingSeriesSchema()} {...formProps}>
      {(form) => {
        const {translations} = useFormContext();
        return (
          <div class="flex flex-col gap-2">
            <Show
              when={
                props.startMeeting.seriesNumber &&
                props.startMeeting.seriesCount &&
                props.startMeeting.seriesNumber !== props.startMeeting.seriesCount
              }
            >
              <div class="font-semibold text-yellow-600">{translations.fieldName("extend_not_from_last_warning")}</div>
            </Show>
            <MeetingSeriesControls
              startDate={DateTime.fromISO(props.startMeeting.date)}
              existingMeetingsInSeries={props.startMeeting.seriesCount}
            />
            <FelteSubmit cancel={props.onCancel} disabled={!!form.warnings("seriesLength")} />
          </div>
        );
      }}
    </FelteForm>
  );
};

interface MeetingSeriseControlsProps {
  readonly startDate: DateTime;
  /**
   * The number of meetings that already exist in the series that is being extended,
   * or undefined if not extending a series.
   */
  readonly existingMeetingsInSeries?: number;
  readonly compact?: boolean;
}

export const MeetingSeriesControls: VoidComponent<MeetingSeriseControlsProps> = (props) => {
  const t = useLangFunc();
  const {form, translations} = useFormContext<MeetingSeriesFormType>();
  const holidays = useHolidays();
  const startDate = createMemo(() => props.startDate.startOf("day"));
  const [meetingDatesTable, setMeetingDatesTable] = createSignal<HTMLDivElement>();
  // Keep meeting dates scrolled to bottom if it was already scrolled to bottom.
  createComputed(
    on(meetingDatesTable, (table) => {
      if (table) {
        setTimeout(() => {
          table.scrollTop = table.scrollHeight;
        });
      }
    }),
  );
  createComputed(
    on(
      () => form.data(),
      () => {
        const table = meetingDatesTable();
        if (!table) {
          return;
        }
        // Use a safety margin.
        if (table.scrollTop >= table.scrollHeight - table.clientHeight - 3) {
          setTimeout(() => {
            table.scrollTop = table.scrollHeight;
          });
        }
      },
    ),
  );
  const meetingSeriesCloneParams = createMemo(() =>
    getMeetingSeriesCloneParams({startDate: startDate(), values: form.data()}),
  );
  createComputed(() =>
    form.setWarnings(
      "seriesLength",
      meetingSeriesCloneParams().dates.length ? null : [t("meetings.only_one_meeting_in_series_warning")],
    ),
  );

  const MeetingDate: VoidComponent<{date: DateTime; class?: string}> = (props) => (
    <span
      class={cx(props.date.isWeekend || holidays.isHoliday(props.date) ? "text-red-800" : "text-black", props.class)}
    >
      <FormattedDateTime dateTime={props.date} format={{...DATE_FORMAT, weekday: "short"}} alignWeekday />
    </span>
  );

  return (
    <div class="flex flex-col gap-2">
      <div class={props.compact ? "self-start" : undefined}>
        <SegmentedControl
          name="seriesInterval"
          items={Array.from(INTERVALS, (interval) => ({
            value: interval,
            label: () => t(`meetings.interval_labels.${interval}`),
          }))}
          small={props.compact}
        />
      </div>
      <RangeField name="seriesLength" min="0" max="1" step="any" />
      <FieldBox name="seriesDates" umbrella>
        <div
          ref={setMeetingDatesTable}
          class={cx("self-start pr-1 flex flex-col overflow-y-auto", props.compact ? "h-24" : "h-72")}
        >
          <span>
            <MeetingDate date={startDate()} class="px-1" />{" "}
            <span class="text-sm">{t("parenthesised", {text: t("meetings.series_first_date")})}</span>
          </span>
          <For
            each={
              getMeetingSeriesCloneParams({
                startDate: startDate(),
                values: form.data(),
                includeAllDates: true,
              }).dates
            }
          >
            {(dateISO) => {
              const date = DateTime.fromISO(dateISO);
              if (form.data("seriesIncludeDate")[dateISO] == undefined) {
                onMount(() =>
                  form.setFields(
                    `seriesIncludeDate.${dateISO}`,
                    date.hasSame(startDate(), "day")
                      ? true
                      : // By default skip weekends (unless the start date is on a weekend) and holidays.
                        !holidays.isHoliday(date) && (!date.isWeekend || startDate().isWeekend),
                  ),
                );
              }
              return (
                <label class="flex items-baseline gap-2 select-none px-1 hover:bg-hover">
                  <MeetingDate
                    date={date}
                    class={cx({[s.meetingDateSkip!]: !form.data("seriesIncludeDate")[dateISO]})}
                  />
                  <CheckboxField name={`seriesIncludeDate.${dateISO}`} label="" data-felte-keep-on-remove />
                </label>
              );
            }}
          </For>
        </div>
      </FieldBox>
      <div>
        {translations.fieldName("number_of_meetings.total", {
          count: meetingSeriesCloneParams().dates.length + (props.existingMeetingsInSeries ?? 1),
        })}
        <Show when={props.existingMeetingsInSeries}>
          {" "}
          <span class="text-grey-text">
            {translations.fieldName("number_of_meetings.including_existing", {count: props.existingMeetingsInSeries})}
          </span>
        </Show>
      </div>
    </div>
  );
};

const SERIES_LENGTH_EXP = 2;

export function numMeetingsToSeriesLength(numMeetings: number) {
  return ((numMeetings - 2) / (MAX_NUM_MEETINGS - 2)) ** (1 / SERIES_LENGTH_EXP);
}

function seriesLengthToNumMeetings(seriesLength: number) {
  return 2 + Math.ceil((MAX_NUM_MEETINGS - 2) * seriesLength ** SERIES_LENGTH_EXP - 0.1);
}

export function getMeetingSeriesCloneParams({
  startDate,
  values,
  includeAllDates = false,
}: {
  startDate: DateTime;
  values: MeetingSeriesFormType;
  includeAllDates?: boolean;
}): FacilityMeeting.CloneRequest {
  const interval = values.seriesInterval as FacilityMeeting.CloneInterval;
  const daysInterval =
    interval === "1d" ? 1 : interval === "7d" ? 7 : interval === "14d" ? 14 : (interval satisfies never);
  const allDates = Array.from({length: seriesLengthToNumMeetings(values.seriesLength) - 1}, (_, i) =>
    startDate.plus({days: daysInterval * (i + 1)}).toISODate(),
  );
  return {
    interval,
    dates: includeAllDates ? allDates : allDates.filter((date) => values.seriesIncludeDate[date]),
  };
}

/**
 * Returns a record that can be applied to values to clear the fields related to series and prevent them
 * from being submitted when creating a form.
 */
export function getClearedSeriesValues() {
  return {
    seriesInterval: undefined,
    seriesLength: undefined,
    seriesIncludeDate: undefined,
  };
}
