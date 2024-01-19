import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";

/** Data associated with a successful API call of creating or editing a meeting. */
export type MeetingChangeSuccessData = Pick<
  MeetingResource,
  "id" | "date" | "startDayminute" | "durationMinutes" | "staff" | "clients" | "resources"
>;
