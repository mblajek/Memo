import {currentDate, cx, getWeekInfo, htmlAttributes, useLangFunc} from "components/utils";
import {DateTime} from "luxon";
import {CgCalendarToday} from "solid-icons/cg";
import {FaSolidArrowLeft, FaSolidArrowRight} from "solid-icons/fa";
import {For, Index, Show, VoidComponent, createMemo, createSignal, mergeProps, splitProps} from "solid-js";
import s from "./TinyCalendar.module.scss";

export type DaysRange = [DateTime, DateTime];

interface Props extends htmlAttributes.div {
  locale: Intl.Locale;
  /** The current selection visible in the tiny calendar. */
  selection?: DaysRange;
  /** The currently displayed month. */
  month: DateTime;
  /** The (minimal) number of days of the previos month that are always shown above the current month. */
  minDaysOfPrevMonth?: number;
  /** The (minimal) number of days of the next month that are always shown below the current month. */
  minDaysOfNextMonth?: number;
  /** The minimum number of weeks to show, to avoid (often) calendar height changes. */
  minWeeks?: number;
  showWeekdayNames?: boolean;
  holidays?: DateTime[];

  /** Returns the range that should be marked as hovered when hovering a day. */
  getHoverRange?: (hoveredDay: DateTime) => DaysRange | undefined;
  /** The function called when month is changed in the view. Controller should change the month prop. */
  setMonth: (month: DateTime) => void;
  /** The function called when a day is clicked. It should typically set selection. */
  onDayClick?: (day: DateTime) => void;
}

const DEFAULT_PROPS = {
  minDaysOfPrevMonth: 2,
  minDaysOfNextMonth: 3,
  minWeeks: 6,
  showWeekdayNames: false,
};

interface DayInfo {
  day: DateTime;
  isToday: boolean;
  classes: string;
}

export const TinyCalendar: VoidComponent<Props> = (props) => {
  const mProps = mergeProps(DEFAULT_PROPS, props);
  const [lProps, divProps] = splitProps(mProps, [
    "selection",
    "month",
    "minDaysOfPrevMonth",
    "minDaysOfNextMonth",
    "minWeeks",
    "showWeekdayNames",
    "holidays",
    "getHoverRange",
    "setMonth",
    "onDayClick",
  ]);

  const t = useLangFunc();
  const weekDaysCalculator = createMemo(() => new WeekDaysCalculator(props.locale));
  const weekInfo = () => weekDaysCalculator().weekInfo;
  const monthStart = createMemo(() => lProps.month.startOf("month"), undefined, {
    equals: (prev, next) => prev.toMillis() === next.toMillis(),
  });
  const [hover, setHover] = createSignal<DateTime>();
  const hoverRange = createMemo<DaysRange | undefined>(() => {
    const h = hover();
    return h && (lProps.getHoverRange ? lProps.getHoverRange(h) : [h, h]);
  });

  const selectionCenter = () =>
    lProps.selection && DateTime.fromMillis((lProps.selection[0].toMillis() + lProps.selection[1].toMillis()) / 2);
  const retButtonAction = createMemo(() => {
    if (lProps.month.hasSame(currentDate(), "month")) {
      const selCenter = selectionCenter();
      if (!selCenter) {
        return undefined;
      }
      return lProps.month.hasSame(selCenter, "month") ? undefined : "toSelection";
    } else {
      return "toCurrent";
    }
  });

  /** List of days to show in the calendar. */
  const days = createMemo(() => {
    const holidaysSet = new Set(lProps.holidays?.map((d) => d.startOf("day").toMillis()));
    let day = weekDaysCalculator().startOfWeek(monthStart().minus({days: lProps.minDaysOfPrevMonth}));
    const res: DayInfo[] = [];
    const last = monthStart().endOf("month").plus({days: lProps.minDaysOfNextMonth});
    while (day <= last || res.length < 7 * lProps.minWeeks || day.weekday !== weekInfo().firstDay) {
      const isToday = day.hasSame(currentDate(), "day");
      res.push({
        day,
        isToday,
        classes: cx({
          [s.today!]: isToday,
          [s.weekend!]: weekInfo().weekend.includes(day.weekday),
          [s.holiday!]: holidaysSet.has(day.toMillis()),
          [s.otherMonth!]: day.month !== monthStart().month,
        }),
      });
      day = day.plus({days: 1});
    }
    return res;
  });

  /**
   * Returns a classlist based on the current day and selection. Sets the specified class for days
   * in the range, and additionally classes start and end on the first and last day of the range.
   */
  function rangeClasses(day: DateTime, range: DaysRange | undefined, rangeClass: string | undefined) {
    return range && rangeClass
      ? {
          [rangeClass]: day >= range[0] && day <= range[1],
          [s.start!]: day.hasSame(range[0], "day"),
          [s.end!]: day.hasSame(range[1], "day"),
        }
      : undefined;
  }

  return (
    <div {...htmlAttributes.merge(divProps, {class: s.tinyCalendar})}>
      <div class={s.header}>
        <button onClick={() => lProps.setMonth(lProps.month.minus({months: 1}))}>
          <FaSolidArrowLeft />
        </button>
        <button onClick={() => lProps.setMonth(lProps.month.plus({months: 1}))}>
          <FaSolidArrowRight />
        </button>
        <div class={s.date}>
          <div>{lProps.month.monthLong}</div>
          <div>{lProps.month.year}</div>
        </div>
        <button
          disabled={!retButtonAction()}
          onClick={() => lProps.setMonth((retButtonAction() === "toSelection" && selectionCenter()) || currentDate())}
          title={
            retButtonAction() === "toSelection" ? t("calendar.go_to_selection") : t("calendar.go_to_current_month")
          }
        >
          <CgCalendarToday classList={{dimmed: !retButtonAction()}} />
        </button>
      </div>
      <div class={s.days}>
        <Show when={lProps.showWeekdayNames}>
          <Index each={Array.from({length: 7})}>
            {(_v, i) => {
              const date = DateTime.fromObject({weekday: weekInfo().firstDay}).plus({days: i});
              return (
                <div class={cx(s.weekday, {[s.weekend!]: weekInfo().weekend.includes(date.weekday)})}>
                  {date.toLocaleString({weekday: "narrow"})}
                </div>
              );
            }}
          </Index>
        </Show>
        <For each={days()}>
          {(di) => (
            <button
              class={cx(s.day, di.classes, rangeClasses(di.day, hoverRange(), s.hover))}
              onClick={() => lProps.onDayClick?.(di.day)}
              onMouseEnter={() => setHover(di.day)}
              onMouseLeave={() => setHover(undefined)}
            >
              <Show when={di.isToday}>
                <div class={s.todayMark} />
              </Show>
              <div class={cx(s.inner, rangeClasses(di.day, lProps.selection, s.selected))}>{di.day.day}</div>
            </button>
          )}
        </For>
      </div>
    </div>
  );
};

export class WeekDaysCalculator {
  readonly weekInfo;

  constructor(readonly locale: Intl.Locale) {
    this.weekInfo = getWeekInfo(locale);
  }

  dayToWeek(day: DateTime): DaysRange {
    const start = this.startOfWeek(day);
    return [start, start.plus({days: 6})];
  }

  dayToWorkdays(day: DateTime): DaysRange {
    if (this.weekInfo.weekend.includes(day.weekday)) {
      return this.dayToWeek(day);
    }
    let start = this.startOfWeek(day);
    while (this.weekInfo.weekend.includes(start.weekday)) {
      start = start.plus({days: 1});
    }
    let d = start;
    let end = d;
    while (!this.weekInfo.weekend.includes(d.weekday)) {
      end = d;
      d = d.plus({day: 1});
    }
    return [start, end];
  }

  startOfWeek(dt: DateTime) {
    return dt.startOf("day").minus({days: (dt.weekday - this.weekInfo.firstDay + 7) % 7});
  }
}
