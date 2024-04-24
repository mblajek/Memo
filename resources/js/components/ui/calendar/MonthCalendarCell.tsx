import {currentDate, cx, htmlAttributes} from "components/utils";
import {filterAndSortInDayView} from "components/utils/day_minute_util";
import {useLocale} from "components/utils/LocaleContext";
import {DateTime} from "luxon";
import {FaSolidCircleDot} from "solid-icons/fa";
import {For, JSX, Show, createMemo, splitProps} from "solid-js";
import {Button} from "../Button";
import {useHolidays} from "./holidays";
import {Block, Event} from "./types";
import {WeekDaysCalculator} from "./week_days_calculator";

interface Props<M> extends htmlAttributes.div {
  readonly month: DateTime;
  readonly day: DateTime;
  readonly monthViewInfo: M;
  readonly blocks: readonly Block<never, M>[];
  readonly events: readonly Event<never, M>[];
  readonly onDateClick: () => void;
  readonly onEmptyClick?: () => void;
}

export const MonthCalendarCell = <M,>(allProps: Props<M>): JSX.Element => {
  const [props, divProps] = splitProps(allProps, [
    "month",
    "day",
    "monthViewInfo",
    "blocks",
    "events",
    "onDateClick",
    "onEmptyClick",
  ]);
  const locale = useLocale();
  const holidays = useHolidays();
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  const isThisMonth = () => props.day.hasSame(props.month, "month");
  const blocks = createMemo(() => filterAndSortInDayView(props.day, props.blocks));
  const events = createMemo(() => filterAndSortInDayView(props.day, props.events));
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "h-full min-h-20 flex flex-col items-stretch text-xs",
        style: {"line-height": 1.1},
      })}
      onClick={() => props.onEmptyClick?.()}
    >
      <div class="bg-inherit pl-0.5 flex items-start gap-1 justify-between">
        <div class="pt-px min-w-0 flex flex-col">
          <For each={blocks()}>{(block) => block.contentInMonthCell?.(props.monthViewInfo)}</For>
        </div>
        <Button
          class={cx(
            "bg-inherit px-0.5 rounded font-semibold flex gap-0.5 items-center text-base -mb-0.5 hover:underline",
            weekDaysCalculator.isWeekend(props.day) || holidays.isHoliday(props.day) ? "text-red-800" : "text-black",
            isThisMonth() ? undefined : "text-opacity-50",
            holidays.isHoliday(props.day) ? "underline decoration-1 hover:decoration-2" : undefined,
          )}
          onClick={(e) => {
            e.stopPropagation();
            props.onDateClick?.();
          }}
        >
          <Show when={props.day.hasSame(currentDate(), "day")}>
            <FaSolidCircleDot class="text-red-700 mb-0.5" size="8" />
          </Show>
          <div class="-mt-1">{props.day.day}</div>
        </Button>
      </div>
      <div class="p-px pt-0 flex flex-col items-stretch gap-px mb-2 mr-2">
        <For each={events()}>{(event) => event.contentInMonthCell?.(props.monthViewInfo)}</For>
      </div>
    </div>
  );
};
