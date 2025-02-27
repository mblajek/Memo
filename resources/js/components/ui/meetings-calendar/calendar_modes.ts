import {createContext, useContext} from "solid-js";

export const CALENDAR_MODES = ["month", "week", "day"] as const;
export type CalendarMode = (typeof CALENDAR_MODES)[number];

export type CalendarFunction = "work" | "timeTables" | "leaveTimes";

export const CalendarFunctionContext = createContext<CalendarFunction>();

export function useCalendarFunctionContext() {
  const context = useContext(CalendarFunctionContext);
  if (!context) {
    throw new Error("Not in calendar function context");
  }
  return context;
}
