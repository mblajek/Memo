import {WeekdayNumbers, WeekSettings} from "luxon";

export const DATE_FORMAT = {year: "numeric", month: "2-digit", day: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const TIME_FORMAT = {hour: "2-digit", minute: "2-digit", second: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const DATE_TIME_FORMAT = {...DATE_FORMAT, ...TIME_FORMAT} satisfies Intl.DateTimeFormatOptions;

export const NUMBER_FORMAT = new Intl.NumberFormat();

const DEFAULT_WEEK_SETTINGS = {
  firstDay: 1,
  weekend: [6, 7],
  minimalDays: 4,
} as const satisfies WeekSettings;

export function getWeekSettings(locale: Intl.Locale): WeekSettings {
  // Some browsers don't have getWeekInfo, and some older ones expose the week info
  // as the weekInfo property instead.
  const weekInfo =
    (locale as Partial<Intl.Locale>).getWeekInfo?.() || (locale as {readonly weekInfo?: Intl.WeekInfo}).weekInfo;
  return {
    ...DEFAULT_WEEK_SETTINGS,
    // The values are really WeekdayNumbers, even though Intl.WeekInfo types them as numbers.
    ...(weekInfo as {firstDay: WeekdayNumbers; weekend: WeekdayNumbers[]} | undefined),
  };
}
