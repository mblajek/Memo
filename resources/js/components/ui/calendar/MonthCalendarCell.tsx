import {NON_NULLABLE} from "components/utils/array_filter";
import {cx} from "components/utils/classnames";
import {filterAndSortInDayView} from "components/utils/day_minute_util";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {currentDate} from "components/utils/time";
import {DateTime} from "luxon";
import {FaSolidCircleDot} from "solid-icons/fa";
import {createMemo, For, JSX, Show, splitProps} from "solid-js";
import {Button} from "../Button";
import {capitalizeString} from "../Capitalize";
import {title} from "../title";
import {CellWithPreferredStyling} from "./CellWithPreferredStyling";
import {useHolidays} from "./holidays";
import {Block, Event} from "./types";

type _Directives = typeof title;

interface Props<M> extends htmlAttributes.div {
  readonly month: DateTime;
  readonly day: DateTime;
  readonly monthViewInfo: M;
  readonly blocks: readonly Block<never, M>[];
  readonly events: readonly Event<never, M>[];
  readonly onDateClick?: () => void;
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
  const t = useLangFunc();
  const holidays = useHolidays();
  const isThisMonth = () => props.day.hasSame(props.month, "month");
  const blocks = createMemo(() => filterAndSortInDayView(props.day, props.blocks));
  const events = createMemo(() => filterAndSortInDayView(props.day, props.events));
  return (
    <CellWithPreferredStyling
      {...htmlAttributes.merge(divProps, {
        class: "h-full min-h-20 text-xs",
        style: {"line-height": 1.1},
        onClick: () => props.onEmptyClick?.(),
      })}
      preferences={[blocks(), events()].flatMap((objs) =>
        objs.map((o) => o.monthCellStylingPreference).filter(NON_NULLABLE),
      )}
    >
      <div class="flex flex-col items-stretch">
        <div class="bg-inherit flex items-start justify-between">
          <div class="grow p-px flex flex-col gap-px min-w-0">
            <For each={blocks()}>{(block) => block.contentInMonthCell?.(props.monthViewInfo)}</For>
          </div>
          <Button
            class={cx(
              "bg-inherit px-0.5 rounded font-semibold flex gap-0.5 items-center text-base -mb-0.5",
              props.day.isWeekend || holidays.isHoliday(props.day) ? "text-red-800" : "text-black",
              isThisMonth() ? undefined : "text-opacity-50",
              holidays.isHoliday(props.day)
                ? ["underline decoration-1", props.onDateClick ? "hover:decoration-2" : undefined]
                : props.onDateClick
                  ? "hover:underline"
                  : undefined,
            )}
            onClick={(e) => {
              e.stopPropagation();
              props.onDateClick!();
            }}
            disabled={!props.onDateClick}
            title={props.day.toLocaleString({dateStyle: "full"})}
          >
            <Show when={props.day.hasSame(currentDate(), "day")}>
              <div use:title={capitalizeString(t("calendar.today"))}>
                <FaSolidCircleDot class="text-red-700 mb-0.5" size="8" />
              </div>
            </Show>
            <div class="-mt-1">{props.day.day}</div>
          </Button>
        </div>
        <div class="p-px pt-0 flex flex-col items-stretch gap-px mb-2 mr-2">
          <For each={events()}>{(event) => event.contentInMonthCell?.(props.monthViewInfo)}</For>
        </div>
      </div>
    </CellWithPreferredStyling>
  );
};
