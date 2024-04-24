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

export type TimeSpan = AllDayTimeSpan | PartDayTimeSpan;

export interface ContentInHoursArea<C> {
  readonly contentInHoursArea: (columnViewInfo: C) => JSX.Element;
}
export interface ContentInAllDayArea<C> {
  readonly contentInAllDayArea: (columnViewInfo: C) => JSX.Element;
  readonly allDayAreaStylingPreference?: CellStylingPreference;
}
export interface ContentInMonthCell<M> {
  readonly contentInMonthCell: (monthViewInfo: M) => JSX.Element;
  readonly monthCellStylingPreference?: CellStylingPreference;
}

/**
 * The preference for the styling of the container. If there are multiple preferences,
 * the last one with the highest strength wins and decides the style of the container.
 */
export interface CellStylingPreference {
  readonly strength: number;
  readonly class?: string;
  readonly style?: JSX.CSSProperties;
}

export interface AllDayBlock<C, M>
  extends AllDayTimeSpan,
    Partial<ContentInHoursArea<C>>,
    ContentInAllDayArea<C>,
    ContentInMonthCell<M> {}
export interface PartDayBlock<C, M>
  extends PartDayTimeSpan,
    ContentInHoursArea<C>,
    Partial<ContentInAllDayArea<C>>,
    Partial<ContentInMonthCell<M>> {}

/**
 * A block represents a time in the calendar that is usually marked with a different background color,
 * and possibly a label. It can represent e.g. working hours or vacation.
 */
export type Block<C, M> = AllDayBlock<C, M> | PartDayBlock<C, M>;

export interface AllDayEvent<C, M>
  extends AllDayTimeSpan,
    Partial<ContentInHoursArea<C>>,
    ContentInAllDayArea<C>,
    ContentInMonthCell<M> {}
export interface PartDayEvent<C, M>
  extends PartDayTimeSpan,
    ContentInHoursArea<C>,
    Partial<ContentInAllDayArea<C>>,
    ContentInMonthCell<M> {}

export type Event<C, M> = AllDayEvent<C, M> | PartDayEvent<C, M>;
