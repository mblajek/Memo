import {Obj} from "@felte/core";
import {useFormContext} from "components/felte-form/FelteForm";
import {
  MAX_DAY_MINUTE,
  dateTimeToTimeInput,
  dayMinuteToHM,
  dayMinuteToTimeInput,
  timeInputToDayMinute,
} from "components/utils/day_minute_util";
import {useAttributes, useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {PartialNullable} from "data-access/memo-api/types";
import {DateTime, Duration, Interval} from "luxon";
import {createComputed, on} from "solid-js";
import {z} from "zod";

export const getMeetingTimeFieldsSchemaPart = () =>
  z.object({
    time: z.object({
      allDay: z.boolean(),
      startTime: z.string(),
      endTime: z.string(),
    }),
  });

export type FormTimeDataType = Obj &
  z.infer<ReturnType<typeof getMeetingTimeFieldsSchemaPart>> & {
    readonly date?: string;
  };

export function meetingTimePartDayInitialValue(time?: DateTime) {
  const localTime = time?.toLocal().startOf("minute");
  function timeInput(time: DateTime | undefined) {
    return time ? dateTimeToTimeInput(time) : "";
  }
  return {
    date: localTime?.toISODate() || "",
    time: {
      allDay: false,
      startTime: timeInput(localTime),
      endTime: "",
    },
    // Initialise the API fields, so that the validation messages for them are allocated correctly.
    // Without these entries, validation messages are treated as unknown validation messages
    // (see UnknownValidationMessages.tsx).
    startDayminute: undefined,
    durationMinutes: undefined,
  } satisfies FormTimeDataType;
}

export function meetingTimeFullDayInitialValue(date: DateTime) {
  return {
    date: date.toISODate(),
    time: {
      allDay: true,
      startTime: "",
      endTime: "",
    },
    // Initialise the API fields, so that the validation messages for them are allocated correctly.
    // Without these entries, validation messages are treated as unknown validation messages
    // (see UnknownValidationMessages.tsx).
    startDayminute: undefined,
    durationMinutes: undefined,
  } satisfies FormTimeDataType;
}

export function useMeetingTimeForm() {
  return useFormContext<FormTimeDataType>().form;
}

/** The meeting duration used for meeting types that don't have default duration. */
const DEFAULT_DURATION_MINUTES = 60;

/**
 * Creates a controller that manipulates the form fields related to meeting time:
 * - Changes the end time when start time is changed to keep the duration.
 * - Changes the end time when the type is changed to set the proper duration for the type.
 * - Sets the actual API fields based on the temporary input fields.
 */
export function createMeetingTimeController() {
  const dictionaries = useDictionaries();
  const meetingTypesDict = () => dictionaries()?.get("meetingType");
  const attributes = useAttributes();
  const durationMinutesAttr = () => attributes()?.getByName<number>("position", "durationMinutes");
  const form = useMeetingTimeForm();
  /** The time part of the form, possibly missing. */
  const formTime = () => form.data("time") as FormTimeDataType["time"] | undefined;
  const durationMinutes = () => formTime() && getMeetingTimeDurationData(formTime()!).durationMinutes;
  function setDurationMinutes(duration: number | undefined, {maxIsAllDay = false} = {}) {
    if (duration === MAX_DAY_MINUTE && maxIsAllDay) {
      form.setFields("time", (v) => ({...v, allDay: true}));
    } else if (duration) {
      const {startTime} = formTime() || {};
      if (startTime) {
        const start = timeInputToDayMinute(startTime, {assert: true});
        const end = (start + duration) % MAX_DAY_MINUTE;
        form.setFields("time", {
          allDay: false,
          startTime,
          endTime: dayMinuteToTimeInput(end),
        });
      } else {
        // We cannot really set the duration, but at least switch to part day.
        form.setFields("time", (v) => ({
          ...v,
          allDay: false,
        }));
      }
    }
  }
  /** The default duration taken from the type. */
  const defaultDurationMinutes = () => {
    const type = form.data("typeDictId");
    if (type && typeof type === "string") {
      const meetingType = meetingTypesDict()?.get(type);
      if (meetingType) {
        return durationMinutesAttr()?.readFrom(meetingType.resource);
      }
    }
  };
  // Change the end time when the start time changes to preserve duration.
  createComputed(
    on(
      () => formTime()?.startTime,
      (startTime, prevStartTime) => {
        const endTime = formTime()?.endTime;
        if (prevStartTime && startTime && startTime !== prevStartTime && endTime) {
          setDurationMinutes(
            getMeetingTimeDurationData({allDay: false, startTime: prevStartTime, endTime}).durationMinutes,
          );
        }
      },
    ),
  );
  // Set the duration to the default duration for the meeting type.
  createComputed(
    on(defaultDurationMinutes, (defaultDurationMinutes, prevDefaultDurationMinutes) => {
      if (defaultDurationMinutes !== undefined) {
        const prevDuration = durationMinutes();
        const shouldSyncDuration = !prevDuration || prevDuration === prevDefaultDurationMinutes;
        if (shouldSyncDuration) {
          const keepPartDay = prevDefaultDurationMinutes === MAX_DAY_MINUTE && !formTime()?.allDay;
          setDurationMinutes(defaultDurationMinutes || DEFAULT_DURATION_MINUTES, {maxIsAllDay: !keepPartDay});
        }
      }
    }),
  );
  return {
    durationMinutes: [durationMinutes, setDurationMinutes] as const,
    defaultDurationMinutes,
  };
}

export function getMeetingTimeDurationData({
  allDay,
  startTime,
  endTime,
}: {
  allDay: boolean;
  startTime?: string;
  endTime?: string;
}) {
  if (allDay) {
    return {startDayMinute: 0, endDayMinute: 0, durationMinutes: MAX_DAY_MINUTE, hasFullTime: true};
  } else {
    const startDayMinute = timeInputToDayMinute(startTime);
    const endDayMinute = timeInputToDayMinute(endTime);
    const hasFullTime = startDayMinute !== undefined && endDayMinute !== undefined;
    const durationMinutes = hasFullTime
      ? ((endDayMinute - startDayMinute + MAX_DAY_MINUTE - 1) % MAX_DAY_MINUTE) + 1
      : undefined;
    return {startDayMinute, endDayMinute, durationMinutes, hasFullTime};
  }
}

export function getMeetingTimeFullData(values: Partial<FormTimeDataType>) {
  const date = values.date ? DateTime.fromISO(values.date) : undefined;
  const {startDayMinute, endDayMinute, durationMinutes, hasFullTime} = getMeetingTimeDurationData(
    values.time || {allDay: false},
  );
  const hasFullDateTime = !!date && hasFullTime;
  return {
    date,
    startDayMinute,
    endDayMinute,
    durationMinutes,
    hasFullDateTime,
    hasFullTime,
    timeValues: values.time
      ? {
          // Remove the temporary field.
          time: undefined,
          ...({
            // Use nulls in case of missing values to let the backend handle the validation.
            startDayminute: startDayMinute ?? null,
            durationMinutes: durationMinutes ?? null,
          } satisfies PartialNullable<MeetingResource>),
        }
      : // Time was not specified, so do not try to set any time-related fields (this might be a partial patch).
        {},
    interval: hasFullDateTime
      ? getMeetingTimeInterval({date, startDayMinute: startDayMinute!, durationMinutes: durationMinutes!})
      : undefined,
  };
}

export function getMeetingTimeInterval({
  date,
  startDayMinute,
  durationMinutes,
}: {
  date: DateTime;
  startDayMinute: number;
  durationMinutes: number;
}) {
  return Interval.after(date.set(dayMinuteToHM(startDayMinute)), Duration.fromObject({minutes: durationMinutes}));
}
