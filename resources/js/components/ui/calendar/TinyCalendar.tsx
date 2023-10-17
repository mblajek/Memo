import {currentDate, cx, htmlAttributes, useLangFunc} from "components/utils";
import {DateTime} from "luxon";
import {CgCalendar, CgCalendarToday} from "solid-icons/cg";
import {FaSolidArrowLeft, FaSolidArrowRight} from "solid-icons/fa";
import {For, Show, VoidComponent, createComputed, createMemo, createSignal, mergeProps, splitProps} from "solid-js";
import {Dynamic} from "solid-js/web";
import s from "./TinyCalendar.module.scss";
import {DaysRange} from "./days_range";
import {WeekDaysCalculator} from "./week_days_calculator";

export interface TinyCalendarProps extends htmlAttributes.div {
  locale: Intl.Locale;
  /** The current selection visible in the tiny calendar. */
  selection?: DaysRange;
  /** The currently displayed month. */
  month: DateTime;
  showWeekdayNames?: boolean;
  holidays?: readonly DateTime[];

  /** Returns the range that should be marked as hovered when hovering a day. */
  getHoverRange?: (hoveredDay: DateTime) => DaysRange | undefined;
  /** The function called when month is changed in the view. Controller should change the month prop. */
  setMonth: (month: DateTime) => void;
  /**
   * The function called when a day is clicked. The second parameter is the hovered range, i.e. the result of
   * getHoverRange. This function typically does something similar to `setSelection(hoverRange)`.
   */
  onDayClick?: (day: DateTime, hoverRange: DaysRange | undefined) => void;
  /** The function called when a day is double clicked. Same parameters as for onDayClick. */
  onDayDoubleClick?: (day: DateTime, hoverRange: DaysRange | undefined) => void;
  /** The function called when the month name is clicked. It is only clickable if this prop is provided. */
  onMonthNameClick?: () => void;

  /** Function called with the full range of visible days. */
  onVisibleRangeChange?: (range: DaysRange) => void;
}

const DEFAULT_PROPS = {
  showWeekdayNames: false,
};

interface DayInfo {
  day: DateTime;
  isToday: boolean;
  classes: string;
}

export const TinyCalendar: VoidComponent<TinyCalendarProps> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, divProps] = splitProps(defProps, [
    "locale",
    "selection",
    "month",
    "showWeekdayNames",
    "holidays",
    "getHoverRange",
    "setMonth",
    "onDayClick",
    "onDayDoubleClick",
    "onMonthNameClick",
    "onVisibleRangeChange",
  ]);

  const t = useLangFunc();
  const weekDaysCalculator = createMemo(() => new WeekDaysCalculator(props.locale));
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
    const start = weekDaysCalculator().startOfWeek(monthStart().minus({days: 2}));
    // Show 6 weeks.
    const numDays = 6 * 7;
    return new DaysRange(start, start.plus({days: numDays - 1}));
  });

  /** List of days to show in the calendar. */
  const days = createMemo(() => {
    const holidaysSet = new Set(props.holidays?.map((d) => d.startOf("day").toMillis()));
    // eslint-disable-next-line solid/reactivity
    return Array.from(range(), (day): DayInfo => {
      const isToday = day.hasSame(currentDate(), "day");
      return {
        day,
        isToday,
        classes: cx({
          [s.today!]: isToday,
          [s.weekend!]: weekDaysCalculator().isWeekend(day),
          [s.startOfWeek!]: weekDaysCalculator().isStartOfWeek(day),
          [s.endOfWeek!]: weekDaysCalculator().isEndOfWeek(day),
          [s.holiday!]: holidaysSet.has(day.toMillis()),
          [s.otherMonth!]: day.month !== monthStart().month,
        }),
      };
    });
  });
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
        <button onClick={() => props.setMonth(props.month.minus({months: 1}))}>
          <FaSolidArrowLeft />
        </button>
        <button onClick={() => props.setMonth(props.month.plus({months: 1}))}>
          <FaSolidArrowRight />
        </button>
        <div class={s.monthYear}>
          <Show when={props.onMonthNameClick} fallback={<div>{props.month.monthLong}</div>}>
            <button onClick={() => props.onMonthNameClick?.()}>{props.month.monthLong}</button>
          </Show>
          <div>{props.month.year}</div>
        </div>
        <button
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
        </button>
      </div>
      <div class={s.days}>
        <Show when={props.showWeekdayNames}>
          <For each={[...weekDaysCalculator().dayToWeek(DateTime.fromMillis(0))]}>
            {(day) => (
              <div class={cx(s.weekday, {[s.weekend!]: weekDaysCalculator().isWeekend(day)})}>
                {day.toLocaleString({weekday: "narrow"})}
              </div>
            )}
          </For>
        </Show>
        <For each={days()}>
          {(di) => (
            <button
              class={cx(s.day, di.classes, rangeClasses(di.day, hoverRange(), s.hover))}
              onClick={() => props.onDayClick?.(di.day, getHoverRange()(di.day))}
              onDblClick={() => props.onDayDoubleClick?.(di.day, getHoverRange()(di.day))}
              onMouseEnter={() => setHover(di.day)}
              onMouseLeave={() => setHover(undefined)}
            >
              <Show when={di.isToday}>
                <div class={s.todayMark} />
              </Show>
              <div class={cx(s.inner, rangeClasses(di.day, props.selection, s.selected))}>{di.day.day}</div>
            </button>
          )}
        </For>
      </div>
    </div>
  );
};
