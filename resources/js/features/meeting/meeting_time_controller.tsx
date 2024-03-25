import {Obj} from "@felte/core";
import {useFormContext} from "components/felte-form/FelteForm";
import {
  MAX_DAY_MINUTE,
  dateTimeToTimeInput,
  dayMinuteToTimeInput,
  timeInputToDayMinute,
  timeInputToHM,
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

interface FormTimeDataType extends Obj {
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
  const durationMinutes = () => getDurationMinutes(form.data("time"));
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
          setDurationMinutes(getDurationMinutes({startTime: prevStartTime, endTime}));
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

/**
 * Calculates the duration in minutes between the two times (in input format). If the inputs are equal,
 * returns full 24 hours instead of zero.
 */
function getDurationMinutes({startTime, endTime}: {startTime?: string; endTime?: string} = {}) {
  if (!startTime || !endTime) {
    return undefined;
  }
  const start = timeInputToDayMinute(startTime, {assert: true});
  const end = timeInputToDayMinute(endTime, {assert: true});
  return ((end - start + MAX_DAY_MINUTE - 1) % MAX_DAY_MINUTE) + 1;
}

/**
 * Transforms the form values to the values expected by the API. The result will typically be merged into
 * the values, as this function handles only the time fields.
 */
export function getTimeValues(values: Partial<FormTimeDataType>) {
  return {
    // Remove the temporary fields.
    time: undefined,
    ...({
      startDayminute: timeInputToDayMinute(values.time?.startTime),
      durationMinutes: getDurationMinutes(values.time),
    } satisfies Partial<MeetingResource>),
  };
}

export function getMeetingTimeInterval(values: FormTimeDataType) {
  if (!values.date) {
    return undefined;
  }
  return Interval.after(
    DateTime.fromISO(values.date).set(timeInputToHM(values.time.startTime)),
    Duration.fromObject({minutes: getDurationMinutes(values.time)}),
  );
}
