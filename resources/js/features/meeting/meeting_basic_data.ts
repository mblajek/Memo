import {MeetingAttendantResourceForCreate, MeetingResource} from "data-access/memo-api/resources/meeting.resource";

/** Partial information about a meeting, helpful for locating it on the calendar. */
export type MeetingBasicData = Pick<
  MeetingResource,
  "id" | "typeDictId" | "date" | "startDayminute" | "durationMinutes" | "resources"
> & {
  readonly staff: readonly MeetingAttendantResourceForCreate[];
};
