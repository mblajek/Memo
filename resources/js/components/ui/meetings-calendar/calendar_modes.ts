export const CALENDAR_MODES = ["month", "week", "day"] as const;
export type CalendarMode = (typeof CALENDAR_MODES)[number];
