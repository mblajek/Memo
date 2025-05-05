import {WeekdayNumbers, WeekSettings} from "luxon";

export const DATE_FORMAT = {year: "numeric", month: "2-digit", day: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const TIME_FORMAT = {hour: "2-digit", minute: "2-digit", second: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const DATE_TIME_FORMAT = {...DATE_FORMAT, ...TIME_FORMAT} satisfies Intl.DateTimeFormatOptions;

export const NUMBER_FORMAT = new Intl.NumberFormat();

/** Polyfill. */
interface Locale extends Intl.Locale {
  readonly getWeekInfo?: () => WeekInfo;
  readonly weekInfo?: WeekInfo;
}

interface WeekInfo {
  readonly firstDay: WeekdayNumbers;
  readonly weekend: WeekdayNumbers[];
  // Note that minimalDays was removed.
}

const DEFAULT_WEEK_SETTINGS = {
  firstDay: 1,
  weekend: [6, 7],
  minimalDays: 4,
} as const satisfies WeekSettings;

export function getWeekSettings(locale: Locale): WeekSettings {
  const weekInfo = locale.getWeekInfo?.() || locale.weekInfo;
  return {
    ...DEFAULT_WEEK_SETTINGS,
    ...weekInfo,
  };
}
