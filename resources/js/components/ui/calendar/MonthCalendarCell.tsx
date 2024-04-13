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
  readonly class?: string;
  readonly month: DateTime;
  readonly day: DateTime;
  readonly workTimes: readonly Event[];
  readonly events: readonly Event[];
  readonly onDateClick: () => void;
  readonly onEmptyClick?: () => void;
}

export const MonthCalendarCell: VoidComponent<Props> = (props) => {
  const locale = useLocale();
  const holidays = useHolidays();
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  const isThisMonth = createMemo(() => props.day.hasSame(props.month, "month"));
  function selectAndSort(events: readonly Event[]) {
    return events
      .filter((event): event is PartDayEvent => !event.allDay && event.date.hasSame(props.day, "day"))
      .sort((a, b) => a.startDayMinute - b.startDayMinute);
  }
  const partDayEvents = createMemo(() => selectAndSort(props.events));
  const workTimes = createMemo(() => selectAndSort(props.workTimes));
  return (
    <div
      class={cx("h-full min-h-20 flex flex-col items-stretch text-xs", props.class)}
      style={{"line-height": "1.1"}}
      onClick={() => props.onEmptyClick?.()}
    >
      <div class="bg-inherit pl-0.5 flex items-start gap-1 justify-between">
        <div class="pt-px min-w-0 flex flex-col">
          <For each={workTimes()}>{(event) => event.content()}</For>
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
        <For each={partDayEvents()}>{(event) => event.content()}</For>
      </div>
    </div>
  );
};
