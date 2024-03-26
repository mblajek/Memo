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
import {DateTime, Duration, Interval} from "luxon";
import {createComputed, on} from "solid-js";
import {z} from "zod";

export const getMeetingTimeFieldsSchemaPart = () => ({
  time: z.object({
    startTime: z.string(),
    endTime: z.string(),
  }),
});

export interface FormTimeDataType extends Obj {
  readonly date?: string;
  readonly time: {
    readonly startTime: string;
    readonly endTime: string;
  };
}

export function meetingTimeInitialValue(time?: DateTime, durationMinutes?: number) {
  const localTime = time?.toLocal().startOf("minute");
  function timeInput(time: DateTime | undefined) {
    return time ? dateTimeToTimeInput(time) : "";
  }
  return {
    date: localTime?.toISODate() || "",
    time: {
      startTime: timeInput(localTime),
      endTime: durationMinutes === undefined ? "" : timeInput(localTime?.plus({minutes: durationMinutes})),
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
  const durationMinutes = () => getMeetingTimeDurationData(form.data("time")).durationMinutes;
  function setDurationMinutes(duration: number | undefined) {
    const {startTime} = form.data("time") || {};
    if (startTime && duration) {
      const start = timeInputToDayMinute(startTime, {assert: true});
      const end = (start + duration) % MAX_DAY_MINUTE;
      form.setFields("time", (v) => ({startTime: v?.startTime || "", endTime: dayMinuteToTimeInput(end)}));
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
      () => form.data("time")?.startTime,
      (startTime, prevStartTime) => {
        const endTime = form.data("time")?.endTime;
        if (prevStartTime && startTime && endTime) {
          setDurationMinutes(getMeetingTimeDurationData({startTime: prevStartTime, endTime}).durationMinutes);
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
          setDurationMinutes(defaultDurationMinutes || DEFAULT_DURATION_MINUTES);
        }
      }
    }),
  );
  return {
    durationMinutes: [durationMinutes, setDurationMinutes] as const,
    defaultDurationMinutes,
  };
}

export function getMeetingTimeDurationData({startTime, endTime}: {startTime?: string; endTime?: string}) {
  const startDayMinute = timeInputToDayMinute(startTime);
  const endDayMinute = timeInputToDayMinute(endTime);
  const hasFullTime = startDayMinute !== undefined && endDayMinute !== undefined;
  const durationMinutes = hasFullTime
    ? ((endDayMinute - startDayMinute + MAX_DAY_MINUTE - 1) % MAX_DAY_MINUTE) + 1
    : undefined;
  return {startDayMinute, endDayMinute, durationMinutes, hasFullTime};
}

export function getMeetingTimeFullData(values: Partial<FormTimeDataType>) {
  const date = values.date ? DateTime.fromISO(values.date) : undefined;
  const {startDayMinute, endDayMinute, durationMinutes, hasFullTime} = getMeetingTimeDurationData(values.time || {});
  const hasFullDateTime = !!date && hasFullTime;
  return {
    date,
    startDayMinute,
    endDayMinute,
    durationMinutes,
    hasFullDateTime,
    hasFullTime,
    timeValues: {
      // Remove the temporary field.
      time: undefined,
      ...({
        startDayminute: startDayMinute,
        durationMinutes,
      } satisfies Partial<MeetingResource>),
    },
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
