import {DateTime} from "luxon";
import {JSX} from "solid-js";
import {DaysRange} from "./days_range";

export interface AllDayTimeSpan {
  readonly allDay: true;
  readonly range: DaysRange;
}

export interface PartDayTimeSpan {
  readonly allDay: false;
  readonly date: DateTime;
  readonly startDayMinute: number;
  readonly durationMinutes: number;
}

export interface AllDayBlock extends AllDayTimeSpan {
  readonly contentInAllDayArea?: () => JSX.Element;
  readonly contentInHoursArea?: () => JSX.Element;
}
export interface PartDayBlock extends PartDayTimeSpan {
  readonly content: () => JSX.Element;
}

/**
 * A block represents a time in the calendar that is usually marked with a different background color,
 * and possibly a label. It can represent e.g. working hours or vacation.
 */
export type Block = AllDayBlock | PartDayBlock;

export interface AllDayEvent extends AllDayTimeSpan {
  readonly content: () => JSX.Element;
}
export interface PartDayEvent extends PartDayTimeSpan {
  readonly content: () => JSX.Element;
}

export type Event = AllDayEvent | PartDayEvent;
