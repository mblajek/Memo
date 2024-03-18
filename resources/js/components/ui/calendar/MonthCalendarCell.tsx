import {currentDate, cx} from "components/utils";
import {useLocale} from "components/utils/LocaleContext";
import {DateTime} from "luxon";
import {FaSolidCircleDot} from "solid-icons/fa";
import {For, Show, VoidComponent, createMemo} from "solid-js";
import {Button} from "../Button";
import {useHolidays} from "./holidays";
import {Event, PartDayEvent} from "./types";
import {WeekDaysCalculator} from "./week_days_calculator";

interface Props {
  readonly month: DateTime;
  readonly day: DateTime;
  readonly events: readonly Event[];
  readonly onDateClick: () => void;
  readonly onEmptyClick?: () => void;
}

export const MonthCalendarCell: VoidComponent<Props> = (props) => {
  const locale = useLocale();
  const holidays = useHolidays();
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  const isThisMonth = createMemo(() => props.day.hasSame(props.month, "month"));
  const partDayEvents = createMemo(() =>
    props.events
      .filter((event): event is PartDayEvent => !event.allDay && event.date.hasSame(props.day, "day"))
      .sort((a, b) => a.startDayMinute - b.startDayMinute),
  );
  return (
    <div
      class="h-full min-h-20 flex flex-col items-stretch text-xs"
      style={{"line-height": "1.1"}}
      onClick={() => props.onEmptyClick?.()}
    >
      <Button
        class={cx(
          "px-0.5 self-end font-semibold flex gap-0.5 items-center text-sm -mb-0.5 hover:underline",
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
        {props.day.day}
      </Button>
      <div class="px-px flex flex-col items-stretch gap-px mb-3">
        <For each={partDayEvents()}>{(event) => event.content()}</For>
      </div>
    </div>
  );
};
