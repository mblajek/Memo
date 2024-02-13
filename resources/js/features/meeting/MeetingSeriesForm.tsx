import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {useHolidays} from "components/ui/calendar/holidays";
import {WeekDaysCalculator} from "components/ui/calendar/week_days_calculator";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {FieldBox} from "components/ui/form/FieldBox";
import {RangeField} from "components/ui/form/RangeField";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {DATE_FORMAT, cx, useLangFunc} from "components/utils";
import {useLocale} from "components/utils/LocaleContext";
import {FormattedDateTime} from "components/utils/date_formatting";
import {DateTime} from "luxon";
import {For, VoidComponent, createComputed, createMemo, createSignal, on, onMount, splitProps} from "solid-js";
import {z} from "zod";
import s from "./MeetingSeriesForm.module.scss";

const getSchema = () =>
  z.object({
    // A string representing the number of days.
    interval: z.string(),
    maxIndex: z.number(),
    includeDate: z.record(z.boolean()),
  });

export type MeetingSeriesFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<MeetingSeriesFormType> {
  readonly id: string;
  readonly startDate: DateTime;
  readonly onCancel?: () => void;
}

const INTERVALS = new Map([
  [1, "every_day"],
  [7, "every_week"],
  [14, "every_two_weeks"],
]);

const MAX_NUM_MEETINGS = 55;

export const MeetingSeriesForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["locale", "id", "startDate", "onCancel"]);
  const t = useLangFunc();
  const locale = useLocale();
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  const holidays = useHolidays();
  const startDate = createMemo(() => props.startDate.startOf("day"));
  const [meetingDatesTable, setMeetingDatesTable] = createSignal<HTMLDivElement>();
  return (
    <FelteForm
      id={props.id}
      translationsFormNames={["meeting_series_create", "meeting_series"]}
      schema={getSchema()}
      {...formProps}
    >
      {(form) => {
        // Keep the meeting dates as millis to make them equal by identity, and thus suitable for the <For> loop.
        const potentialMeetingDatesMillis = createMemo(() =>
          // eslint-disable-next-line solid/reactivity
          Array.from({length: form.data("maxIndex") + 1}, (_, i) =>
            startDate()
              .plus({days: Number(form.data("interval")) * i})
              .toMillis(),
          ),
        );
        // Keep meeting dates scrolled to bottom if it was already scrolled to bottom.
        createComputed(
          on(
            () => form.data(),
            () => {
              const table = meetingDatesTable();
              if (!table) {
                return;
              }
              if (table.scrollTop >= table.scrollHeight - table.clientHeight) {
                setTimeout(() => (table.scrollTop = table.scrollHeight), 0);
              }
            },
          ),
        );
        const meetingSeriesDates = createMemo(() => getMeetingSeriesDates(startDate(), form.data()));
        return (
          <div class="flex flex-col gap-2">
            <SegmentedControl
              name="interval"
              items={Array.from(INTERVALS, ([value, name]) => ({
                value: String(value),
                label: () => t(`forms.meeting_series.interval_labels.${name}`),
              }))}
            />
            <RangeField name="maxIndex" min="1" max={MAX_NUM_MEETINGS - 1} />
            <FieldBox name="meetingDates" umbrella>
              <div ref={setMeetingDatesTable} class="self-start h-72 flex flex-col overflow-y-auto">
                <For each={potentialMeetingDatesMillis()}>
                  {(dateMillis, index) => {
                    const date = DateTime.fromMillis(dateMillis);
                    const isoDate = date.toISODate();
                    if (form.data("includeDate")[isoDate] == undefined) {
                      onMount(() =>
                        form.setFields(
                          `includeDate.${isoDate}`,
                          date.hasSame(startDate(), "day")
                            ? true
                            : // By default skip weekends (unless the start date is on a weekend) and holidays.
                              !holidays.isHoliday(date) &&
                                (!weekDaysCalculator.isWeekend(date) || weekDaysCalculator.isWeekend(startDate())),
                        ),
                      );
                    }
                    return (
                      <label class="flex items-baseline gap-2 select-none px-1 hover:bg-hover">
                        <div
                          class={cx(
                            weekDaysCalculator.isWeekend(date) || holidays.isHoliday(date)
                              ? "text-red-800"
                              : "text-black",
                            {[s.meetingDateSkip!]: !form.data("includeDate")[isoDate]},
                          )}
                        >
                          <FormattedDateTime dateTime={date} format={{...DATE_FORMAT, weekday: "short"}} alignWeekday />
                        </div>
                        <CheckboxField
                          name={`includeDate.${isoDate}`}
                          label=""
                          disabled={!index()}
                          data-felte-keep-on-remove
                        />
                      </label>
                    );
                  }}
                </For>
              </div>
            </FieldBox>
            <div>
              {t("forms.meeting_series.total_number_of_meetings", {
                count: meetingSeriesDates().length,
              })}
            </div>
            <FelteSubmit cancel={props.onCancel} disabled={meetingSeriesDates().length < 2} />
          </div>
        );
      }}
    </FelteForm>
  );
};

export function getMeetingSeriesDates(startDate: DateTime, formValues: MeetingSeriesFormType) {
  return Array.from({length: formValues.maxIndex + 1}, (_, i) =>
    startDate.plus({days: Number(formValues.interval) * i}),
  ).filter((date) => formValues.includeDate[date.toISODate()]);
}
