import {DateTime} from "luxon";

/**
 * A range of days, both ends inclusive.
 * We do not use luxon's Interval because its end is exclusive and it complicates calculations.
 */
export class DaysRange {
  /** The start of the first day of the range. */
  readonly start;
  /** The end of the last day of the range. */
  readonly end;

  /** Creates a range between the specified days. */
  constructor(start: DateTime, end: DateTime) {
    this.start = start.startOf("day");
    this.end = end.endOf("day");
    if (this.start > this.end) {
      throw new Error(`Expected non-empty range, got start=${start.toISO()}, end=${end.toISO()}`);
    }
  }

  static oneDay(day: DateTime) {
    return new DaysRange(day, day);
  }

  /** Returns the center date and time of the range. */
  center() {
    return DateTime.fromMillis(Math.round((this.start.toMillis() + this.end.toMillis() + 1) / 2));
  }

  contains(day: DateTime) {
    return day >= this.start && day <= this.end;
  }

  intersects(other: DaysRange) {
    return this.start <= other.end && other.start <= this.end;
  }

  /** Checks whether the other range is contained completely in this range. */
  engulfs(other: DaysRange) {
    return other.start >= this.start && other.end <= this.end;
  }

  /** Returns the number of days in the range. */
  length() {
    return Math.round(this.end.diff(this.start, "days").days);
  }

  [Symbol.iterator](): Iterator<DateTime> {
    let current = this.start;
    return {
      next: () => {
        if (current > this.end) {
          return {value: undefined, done: true};
        }
        try {
          return {value: current};
        } finally {
          current = current.plus({days: 1});
        }
      },
    };
  }

  toString() {
    return `[${this.start.toISO()}..${this.end.toISO()}]`;
  }
}
