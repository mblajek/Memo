import {cx, htmlAttributes} from "components/utils";
import {useLocale} from "components/utils/LocaleContext";
import {DateTime} from "luxon";
import {For, JSX, VoidComponent, createMemo, splitProps} from "solid-js";
import {LoadingPane} from "../LoadingPane";
import {DaysRange} from "./days_range";
import {WeekDaysCalculator} from "./week_days_calculator";

interface Props extends htmlAttributes.div {
  readonly month: DateTime;
  readonly days: readonly MonthCalendarDay[];
  readonly isLoading?: boolean;

  readonly onWheelWithAlt?: (e: WheelEvent) => void;
}

export interface MonthCalendarDay {
  readonly day: DateTime;
  readonly content: () => JSX.Element;
}

export const MonthCalendar: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["month", "days", "isLoading", "onWheelWithAlt"]);
  const locale = useLocale();
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  const daysRange = () => getMonthCalendarRange(weekDaysCalculator, props.month);
  const calendarDaysMap = createMemo<ReadonlyMap<number, MonthCalendarDay>>(() => {
    const map = new Map<number, MonthCalendarDay>();
    for (const day of props.days) {
      map.set(day.day.startOf("day").toMillis(), day);
    }
    return map;
  });
  return (
    <div {...htmlAttributes.merge(divProps, {class: "relative"})}>
      <div
        class="h-full p-px grid gap-px"
        style={{
          "grid-template-columns": `[content-start] ${weekDaysCalculator.weekdays
            .map(({isWeekend}) => `minmax(0, ${isWeekend ? "0.75" : "1"}fr)`)
            .join(" ")} [content-end] var(--sb-size)`,
          "grid-template-rows": "min-content 1fr",
        }}
      >
        <div class="bg-gray-300 row-span-full rounded-sm -m-px" style={{"grid-column": "content"}} />
        <div class="col-span-full row-start-1 grid grid-rows-subgrid grid-cols-subgrid">
          <For each={weekDaysCalculator.weekdays}>
            {({exampleDay, isWeekend}) => (
              <div
                class={cx(
                  "bg-white rounded-sm text-center uppercase text-xs overflow-clip",
                  isWeekend ? "text-red-800" : "text-black",
                )}
              >
                {exampleDay.toLocaleString({weekday: "long"})}
              </div>
            )}
          </For>
        </div>
        <div
          ref={(div) =>
            div.addEventListener(
              "wheel",
              (e) => {
                if (e.altKey) {
                  props.onWheelWithAlt?.(e);
                  e.preventDefault();
                }
              },
              {passive: false},
            )
          }
          class="col-span-full row-start-2 grid grid-cols-subgrid gap-px overflow-x-clip overflow-y-auto"
          style={{"grid-auto-rows": "1fr"}}
        >
          <For each={[...daysRange()]}>
            {(day, index) => (
              <div class={cx("rounded-sm overflow-clip", index() % 7 ? undefined : "col-start-1")}>
                {calendarDaysMap().get(day.toMillis())?.content()}
              </div>
            )}
          </For>
        </div>
      </div>
      <LoadingPane isLoading={props.isLoading} />
    </div>
  );
};

export function getMonthCalendarRange(weekDaysCalculator: WeekDaysCalculator, day: DateTime) {
  return new DaysRange(
    weekDaysCalculator.startOfWeek(day.startOf("month")),
    weekDaysCalculator.endOfWeek(day.endOf("month")),
  );
}
