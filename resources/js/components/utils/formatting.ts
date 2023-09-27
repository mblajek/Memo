export const DATE_FORMAT = {year: "numeric", month: "2-digit", day: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const DATE_WITH_WEEKDAY_FORMAT = {...DATE_FORMAT, weekday: "short"} satisfies Intl.DateTimeFormatOptions;

export const TIME_FORMAT = {hour: "2-digit", minute: "2-digit", second: "2-digit"} satisfies Intl.DateTimeFormatOptions;

export const DATE_TIME_FORMAT = {...DATE_FORMAT, ...TIME_FORMAT} satisfies Intl.DateTimeFormatOptions;
export const DATE_TIME_WITH_WEEKDAY_FORMAT = {
  ...DATE_WITH_WEEKDAY_FORMAT,
  ...TIME_FORMAT,
} satisfies Intl.DateTimeFormatOptions;

export const NUMBER_FORMAT = new Intl.NumberFormat();

/**
 * Polyfill for the interface that is not yet found in TS.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getWeekInfo
 */
export interface WeekInfo {
  firstDay: number;
  weekend: number[];
  minimalDays: number;
}

interface Locale extends Intl.Locale {
  getWeekInfo?: () => WeekInfo;
  weekInfo?: WeekInfo;
}

const DEFAULT_WEEK_INFO = {
  firstDay: 1,
  weekend: [6, 7],
  minimalDays: 4,
} satisfies WeekInfo;

let weekInfoCache: WeekInfo | undefined;

export function getWeekInfo() {
  if (!weekInfoCache) {
    const locale = new Intl.Locale(new Intl.DateTimeFormat().resolvedOptions().locale) as Locale;
    weekInfoCache = locale.getWeekInfo?.() || locale.weekInfo || DEFAULT_WEEK_INFO;
  }
  return weekInfoCache;
}
