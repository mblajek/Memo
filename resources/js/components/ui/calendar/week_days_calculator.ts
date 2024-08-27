import {getWeekInfo} from "components/utils";
import {DateTime} from "luxon";
import {DaysRange} from "./days_range";

export class WeekDaysCalculator {
  readonly weekInfo;
  /** A list of week days, sorted by index (0 to 6). */
  readonly weekdays;

  constructor(readonly locale: Intl.Locale) {
    this.weekInfo = getWeekInfo(locale);
    const week = this.dayToWeek(DateTime.fromMillis(0));
    this.weekdays = Array.from(week, (exampleDay, index) => ({
      weekday: exampleDay.weekday,
      isWeekend: this.isWeekend(exampleDay),
      index,
      exampleDay,
    }));
  }

  /** Returns the calendar week that contains this day. */
  dayToWeek(day: DateTime) {
    const start = this.startOfWeek(day);
    return new DaysRange(start, start.plus({days: 6}));
  }

  /** Returns the work week that contains this day, or the calendar week if the day is on weekend. */
  dayToWorkdays(day: DateTime) {
    if (this.isWeekend(day)) {
      return this.dayToWeek(day);
    }
    let start = this.startOfWeek(day);
    while (this.isWeekend(start)) {
      start = start.plus({days: 1});
    }
    let d = start;
    let end = d;
    while (!this.isWeekend(d)) {
      end = d;
      d = d.plus({day: 1});
    }
    return new DaysRange(start, end);
  }

  startOfWeek(dt: DateTime) {
    return dt.startOf("day").minus({days: (dt.weekday - this.weekInfo.firstDay + 7) % 7});
  }

  endOfWeek(dt: DateTime) {
    return dt.endOf("day").minus({days: ((dt.weekday - this.weekInfo.firstDay + 7) % 7) - 6});
  }

  isWeekend(day: DateTime) {
    return this.weekInfo.weekend.includes(day.weekday);
  }

  isStartOfWeek(day: DateTime) {
    return day.weekday === this.weekInfo.firstDay;
  }

  isEndOfWeek(day: DateTime) {
    return (day.weekday + 8 - this.weekInfo.firstDay) % 7 === 0;
  }
}
