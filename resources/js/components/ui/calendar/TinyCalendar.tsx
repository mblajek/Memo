import {currentDate, cx, getWeekInfo, htmlAttributes, useLangFunc} from "components/utils";
import {DateTime} from "luxon";
import {CgCalendarToday} from "solid-icons/cg";
import {FaSolidArrowLeft, FaSolidArrowRight} from "solid-icons/fa";
import {For, Index, Show, VoidComponent, createMemo, createSignal, mergeProps, splitProps} from "solid-js";
import {Button} from "../Button";
import s from "./TinyCalendar.module.scss";

export type DaysRange = [DateTime, DateTime];

interface Props extends htmlAttributes.div {
  locale: Intl.Locale;
  /** The current selection visible in the tiny calendar. */
  selection?: DaysRange;
  /** The currently displayed month. */
  month: DateTime;
  showWeekdayNames?: boolean;
  holidays?: DateTime[];

  /** Returns the range that should be marked as hovered when hovering a day. */
  getHoverRange?: (hoveredDay: DateTime) => DaysRange | undefined;
  /** The function called when month is changed in the view. Controller should change the month prop. */
  setMonth: (month: DateTime) => void;
  /**
   * The function called when a day is clicked. The second parameter is the hovered range, i.e. the result of
   * getHoverRange. This function typically does something similar to `setSelection(hoverRange)`. */
  onDayClick?: (day: DateTime, hoverRange: DaysRange | undefined) => void;
}

const DEFAULT_PROPS = {
  showWeekdayNames: false,
};

interface DayInfo {
  day: DateTime;
  isToday: boolean;
  classes: string;
}

export const TinyCalendar: VoidComponent<Props> = (allProps) => {
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
  ]);

  const t = useLangFunc();
  const weekDaysCalculator = createMemo(() => new WeekDaysCalculator(props.locale));
  const weekInfo = () => weekDaysCalculator().weekInfo;
  const monthStart = createMemo(() => props.month.startOf("month"), undefined, {
    equals: (prev, next) => prev.toMillis() === next.toMillis(),
  });
  const [hover, setHover] = createSignal<DateTime>();
  const getHoverRange = () => props.getHoverRange || ((d: DateTime) => [d, d]);
  const hoverRange = createMemo<DaysRange | undefined>(() => hover() && getHoverRange()(hover()!));

  const selectionCenter = () =>
    props.selection && DateTime.fromMillis((props.selection[0].toMillis() + props.selection[1].toMillis()) / 2);
  const retButtonAction = createMemo(() => {
    if (props.month.hasSame(currentDate(), "month")) {
      const selCenter = selectionCenter();
      if (!selCenter) {
        return undefined;
      }
      return props.month.hasSame(selCenter, "month") ? undefined : "toSelection";
    } else {
      return "toCurrent";
    }
  });

  /** List of days to show in the calendar. */
  const days = createMemo<DayInfo[]>(() => {
    const holidaysSet = new Set(props.holidays?.map((d) => d.startOf("day").toMillis()));
    // Always show (at least) two days of the previous month.
    const start = weekDaysCalculator().startOfWeek(monthStart().minus({days: 2}));
    // Show 6 weeks.
    // eslint-disable-next-line solid/reactivity
    return Array.from({length: 6 * 7}, (_, i) => {
      const day = start.plus({days: i});
      const isToday = day.hasSame(currentDate(), "day");
      return {
        day,
        isToday,
        classes: cx({
          [s.today!]: isToday,
          [s.weekend!]: weekInfo().weekend.includes(day.weekday),
          [s.holiday!]: holidaysSet.has(day.toMillis()),
          [s.otherMonth!]: day.month !== monthStart().month,
        }),
      };
    });
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
        <Button onClick={() => props.setMonth(props.month.minus({months: 1}))}>
          <FaSolidArrowLeft />
        </Button>
        <Button onClick={() => props.setMonth(props.month.plus({months: 1}))}>
          <FaSolidArrowRight />
        </Button>
        <div class={s.date}>
          <div>{props.month.monthLong}</div>
          <div>{props.month.year}</div>
        </div>
        <Button
          disabled={!retButtonAction()}
          onClick={() => props.setMonth((retButtonAction() === "toSelection" && selectionCenter()) || currentDate())}
          title={
            retButtonAction() === "toSelection" ? t("calendar.go_to_selection") : t("calendar.go_to_current_month")
          }
        >
          <CgCalendarToday classList={{dimmed: !retButtonAction()}} />
        </Button>
      </div>
      <div class={s.days}>
        <Show when={props.showWeekdayNames}>
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
            <Button
              class={cx(s.day, di.classes, rangeClasses(di.day, hoverRange(), s.hover))}
              onClick={() => props.onDayClick?.(di.day, getHoverRange()(di.day))}
              onMouseEnter={() => setHover(di.day)}
              onMouseLeave={() => setHover(undefined)}
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
