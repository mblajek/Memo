import {currentDate, cx, htmlAttributes, useLangFunc} from "components/utils";
import {useLocale} from "components/utils/LocaleContext";
import {DateTime} from "luxon";
import {BsCaretDown, BsCaretUp} from "solid-icons/bs";
import {CgCalendar, CgCalendarToday} from "solid-icons/cg";
import {FaSolidArrowLeft, FaSolidArrowRight} from "solid-icons/fa";
import {For, Show, VoidComponent, createComputed, createMemo, createSignal, mergeProps, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";
import {Button} from "../Button";
import {PopOver} from "../PopOver";
import {SimpleMenu} from "../SimpleMenu";
import s from "./TinyCalendar.module.scss";
import {DaysRange} from "./days_range";
import {useHolidays} from "./holidays";
import {WeekDaysCalculator} from "./week_days_calculator";

interface Props extends htmlAttributes.div {
  /** The current selection visible in the tiny calendar. */
  readonly selection?: DaysRange;
  /** The currently displayed month. */
  readonly month: DateTime;
  readonly showWeekdayNames?: boolean;

  /** Returns the range that should be marked as hovered when hovering a day. */
  readonly getHoverRange?: (hoveredDay: DateTime) => DaysRange | undefined;
  /** The function called when month is changed in the view. Controller should change the month prop. */
  readonly setMonth: (month: DateTime) => void;
  /**
   * The function called when a day is clicked. The second parameter is the hovered range, i.e. the result of
   * getHoverRange. This function typically does something similar to `setSelection(hoverRange)`.
   */
  readonly onDayClick?: (day: DateTime, hoverRange: DaysRange | undefined) => void;
  /** The function called when a day is double clicked. Same parameters as for onDayClick. */
  readonly onDayDoubleClick?: (day: DateTime, hoverRange: DaysRange | undefined) => void;
  /** The function called when the month name is clicked. It is only clickable if this prop is provided. */
  readonly onMonthNameClick?: () => void;

  /** Function called with the full range of visible days. */
  readonly onVisibleRangeChange?: (range: DaysRange) => void;
}

const YEARS_RANGE = [1900, 9999] as const;

const DEFAULT_PROPS = {
  showWeekdayNames: false,
} satisfies Partial<Props>;

interface DayInfo {
  day: DateTime;
  isToday: boolean;
  classes: string;
}

export const TinyCalendar: VoidComponent<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, divProps] = splitProps(defProps, [
    "selection",
    "month",
    "showWeekdayNames",
    "getHoverRange",
    "setMonth",
    "onDayClick",
    "onDayDoubleClick",
    "onMonthNameClick",
    "onVisibleRangeChange",
  ]);

  const t = useLangFunc();
  const locale = useLocale();
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  const holidays = useHolidays();
  const monthStart = createMemo(() => props.month.startOf("month"), undefined, {
    equals: (prev, next) => prev.toMillis() === next.toMillis(),
  });
  const [hover, setHover] = createSignal<DateTime>();
  const getHoverRange = () => props.getHoverRange || DaysRange.oneDay;
  const hoverRange = createMemo<DaysRange | undefined>(() => hover() && getHoverRange()(hover()!));

  const retButtonAction = createMemo(() => {
    if (props.month.hasSame(currentDate(), "month")) {
      const selCenter = props.selection?.center();
      if (!selCenter) {
        return undefined;
      }
      return props.month.hasSame(selCenter, "month") ? undefined : "toSelection";
    } else {
      return "toCurrent";
    }
  });

  /** The range of days to show in the calendar. */
  const range = createMemo(() => {
    // Always show (at least) two days of the previous month.
    const start = weekDaysCalculator.startOfWeek(monthStart().minus({days: 2}));
    // Show 6 weeks.
    const numDays = 6 * 7;
    return new DaysRange(start, start.plus({days: numDays - 1}));
  });

  /** List of days to show in the calendar. */
  const days = createMemo(() =>
    // eslint-disable-next-line solid/reactivity
    Array.from(range(), (day): DayInfo => {
      const isToday = day.hasSame(currentDate(), "day");
      return {
        day,
        isToday,
        classes: cx({
          [s.today!]: isToday,
          [s.weekend!]: weekDaysCalculator.isWeekend(day),
          [s.startOfWeek!]: weekDaysCalculator.isStartOfWeek(day),
          [s.endOfWeek!]: weekDaysCalculator.isEndOfWeek(day),
          [s.holiday!]: holidays.isHoliday(day),
          [s.otherMonth!]: day.month !== monthStart().month,
        }),
      };
    }),
  );
  createComputed(() => props.onVisibleRangeChange?.(range()));

  /**
   * Returns a classlist based on the current day and selection. Sets the specified class for days
   * in the range, and additionally classes start and end on the first and last day of the range.
   */
  function rangeClasses(day: DateTime, range: DaysRange | undefined, rangeClass: string | undefined) {
    return range && rangeClass
      ? {
          [rangeClass]: range.contains(day),
          [s.start!]: day.hasSame(range.start, "day"),
          [s.end!]: day.hasSame(range.end, "day"),
        }
      : undefined;
  }

  return (
    <div {...htmlAttributes.merge(divProps, {class: s.tinyCalendar})}>
      <div class={s.header}>
        <Button onClick={() => props.setMonth(props.month.minus({months: 1}))}>
          <FaSolidArrowLeft />
        </Button>
        <Button onClick={() => props.setMonth(props.month.plus({months: 1}))}>
          <FaSolidArrowRight />
        </Button>
        <div class={s.monthYear}>
          <Show when={props.onMonthNameClick} fallback={<div>{props.month.monthLong}</div>}>
            <Button onClick={() => props.onMonthNameClick?.()}>{props.month.monthLong}</Button>
          </Show>
          <PopOver trigger={(triggerProps) => <Button {...triggerProps()}>{props.month.year}</Button>}>
            {(popOver) => {
              const yearsRadius = 5;
              const [centerYear, setCenterYear] = createSignal(props.month.year);
              createComputed(() =>
                setCenterYear(
                  Math.min(Math.max(centerYear(), YEARS_RANGE[0] + yearsRadius), YEARS_RANGE[1] - yearsRadius),
                ),
              );
              return (
                <SimpleMenu>
                  <Button class="flex justify-center" onClick={() => setCenterYear((y) => y - yearsRadius)}>
                    <BsCaretUp />
                  </Button>
                  <For each={Array.from({length: 2 * yearsRadius + 1}, (_, i) => centerYear() + i - yearsRadius)}>
                    {(year) => (
                      <Button
                        class={year === props.month.year ? "font-bold" : undefined}
                        onClick={() => {
                          popOver().close();
                          props.setMonth(props.month.set({year}));
                        }}
                      >
                        {year}
                      </Button>
                    )}
                  </For>
                  <Button class="flex justify-center" onClick={() => setCenterYear((y) => y + yearsRadius)}>
                    <BsCaretDown />
                  </Button>
                </SimpleMenu>
              );
            }}
          </PopOver>
        </div>
        <Button
          disabled={!retButtonAction()}
          onClick={() =>
            props.setMonth((retButtonAction() === "toSelection" && props.selection?.center()) || currentDate())
          }
          title={
            retButtonAction() === "toSelection" ? t("calendar.go_to_selection") : t("calendar.go_to_current_month")
          }
        >
          <Dynamic
            component={retButtonAction() === "toSelection" ? CgCalendar : CgCalendarToday}
            classList={{dimmed: !retButtonAction()}}
          />
        </Button>
      </div>
      <div class={s.days}>
        <Show when={props.showWeekdayNames}>
          <For each={weekDaysCalculator.weekdays}>
            {({exampleDay, isWeekend}) => (
              <div class={cx(s.weekday, {[s.weekend!]: isWeekend})}>
                {exampleDay.toLocaleString({weekday: "narrow"})}
              </div>
            )}
          </For>
        </Show>
        <For each={days()}>
          {(di) => (
            <Button
              class={cx(s.day, di.classes, rangeClasses(di.day, hoverRange(), s.hover))}
              onClick={() => props.onDayClick?.(di.day, getHoverRange()(di.day))}
              onDblClick={() => props.onDayDoubleClick?.(di.day, getHoverRange()(di.day))}
              onMouseEnter={[setHover, di.day]}
              onMouseLeave={[setHover, undefined]}
            >
              <Show when={di.isToday}>
                <div class={s.todayMark} />
              </Show>
              <div class={cx(s.inner, rangeClasses(di.day, props.selection, s.selected))}>{di.day.day}</div>
            </Button>
          )}
        </For>
      </div>
    </div>
  );
};
