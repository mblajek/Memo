import {style} from "components/ui/inline_styles";
import {cx} from "components/utils/classnames";
import {htmlAttributes} from "components/utils/html_attributes";
import {DateTime} from "luxon";
import {createMemo, For, JSX, splitProps, VoidComponent} from "solid-js";
import {LoadingPane} from "../LoadingPane";
import {DaysRange} from "./days_range";
import {getWeekdays} from "./week_days_calculator";

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
  const weekdays = getWeekdays();
  const daysRange = () => getMonthCalendarRange(props.month);
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
        {...style({
          "grid-template-columns": `[content-start] ${weekdays
            .map(({isWeekend}) => `minmax(0, ${isWeekend ? "0.75" : "1"}fr)`)
            .join(" ")} [content-end] var(--sb-size)`,
          "grid-template-rows": "min-content 1fr",
        })}
      >
        <div class="bg-gray-300 row-span-full rounded-xs -m-px" {...style({"grid-column": "content"})} />
        <div class="col-span-full row-start-1 grid grid-rows-subgrid grid-cols-subgrid">
          <For each={weekdays}>
            {({exampleDay, isWeekend}) => (
              <div
                class={cx(
                  "bg-white rounded-xs text-center uppercase text-xs overflow-clip",
                  isWeekend ? "text-red-800" : "text-black",
                )}
              >
                {exampleDay.toLocaleString({weekday: "long"})}
              </div>
            )}
          </For>
        </div>
        <div
          on:wheel={{
            handleEvent: (e) => {
              if (e.altKey) {
                props.onWheelWithAlt?.(e);
                e.preventDefault();
              }
            },
            passive: false,
          }}
          class="col-span-full row-start-2 grid grid-cols-subgrid gap-px overflow-x-clip overflow-y-auto"
          {...style({"grid-auto-rows": "1fr"})}
        >
          <For each={[...daysRange()]}>
            {(day, index) => (
              <div class={cx("rounded-xs overflow-clip", index() % 7 ? undefined : "col-start-1")}>
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

export function getMonthCalendarRange(day: DateTime) {
  return new DaysRange(
    day.startOf("month").startOf("week", {useLocaleWeeks: true}),
    day.endOf("month").endOf("week", {useLocaleWeeks: true}),
  );
}
