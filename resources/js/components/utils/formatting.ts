const DATE_FORMAT_PARAMS =
  {year: "numeric", month: "2-digit", day: "2-digit"} satisfies Intl.DateTimeFormatOptions;
const WEEKDAY_FORMAT_PARAMS = {weekday: "short"} satisfies Intl.DateTimeFormatOptions;
const TIME_FORMAT_PARAMS =
  {hour: "2-digit", minute: "2-digit", second: "2-digit"} satisfies Intl.DateTimeFormatOptions;

export const DATE_FORMAT = new Intl.DateTimeFormat(undefined, DATE_FORMAT_PARAMS);
export const DATE_WITH_WEEKDAY_FORMAT = new Intl.DateTimeFormat(
  undefined, {...DATE_FORMAT_PARAMS, ...WEEKDAY_FORMAT_PARAMS});

export const TIME_FORMAT = new Intl.DateTimeFormat(undefined, TIME_FORMAT_PARAMS);

export const DATE_TIME_FORMAT = new Intl.DateTimeFormat(
  undefined, {...DATE_FORMAT_PARAMS, ...TIME_FORMAT_PARAMS});
export const DATE_TIME_WITH_WEEKDAY_FORMAT = new Intl.DateTimeFormat(
  undefined, {...DATE_FORMAT_PARAMS, ...WEEKDAY_FORMAT_PARAMS, ...TIME_FORMAT_PARAMS});

export const NUMBER_FORMAT = new Intl.NumberFormat();
