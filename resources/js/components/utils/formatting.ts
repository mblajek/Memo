import {WeekSettings} from "luxon";

export const DATE_FORMAT = {year: "numeric", month: "2-digit", day: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const TIME_FORMAT = {hour: "2-digit", minute: "2-digit", second: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const DATE_TIME_FORMAT = {...DATE_FORMAT, ...TIME_FORMAT} satisfies Intl.DateTimeFormatOptions;

export const NUMBER_FORMAT = new Intl.NumberFormat();

/** Polyfill. */
interface Locale extends Intl.Locale {
  getWeekInfo?: () => WeekSettings;
  weekInfo?: WeekSettings;
}

const DEFAULT_WEEK_INFO = {
  firstDay: 1,
  weekend: [6, 7],
  minimalDays: 4,
} satisfies WeekSettings;

export function getWeekInfo(locale: Locale) {
  return {
    // Include the defaults, as some Android Chrome version is known to return an incomplete object,
    // which makes luxon fail.
    ...DEFAULT_WEEK_INFO,
    ...(locale.getWeekInfo?.() || locale.weekInfo),
  };
}
