export const DATE_FORMAT = {year: "numeric", month: "2-digit", day: "2-digit"} satisfies Intl.DateTimeFormatOptions;
export const DATE_WITH_WEEKDAY_FORMAT = {...DATE_FORMAT, weekday: "short"} satisfies Intl.DateTimeFormatOptions;

export const TIME_FORMAT = {hour: "2-digit", minute: "2-digit", second: "2-digit"} satisfies Intl.DateTimeFormatOptions;

export const DATE_TIME_FORMAT = {...DATE_FORMAT, ...TIME_FORMAT} satisfies Intl.DateTimeFormatOptions;
export const DATE_TIME_WITH_WEEKDAY_FORMAT = {
  ...DATE_WITH_WEEKDAY_FORMAT,
  ...TIME_FORMAT,
} satisfies Intl.DateTimeFormatOptions;

export const NUMBER_FORMAT = new Intl.NumberFormat();
