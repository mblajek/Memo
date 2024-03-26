import {AnchorProps} from "@solidjs/router";
import {toPlainObject} from "components/utils/object_util";
import {MeetingBasicData} from "features/meeting/meeting_basic_data";

export interface CalendarLocationState {
  readonly meetingToShow?: MeetingBasicData;
}

export type CalendarSearchParams = {
  readonly meetingId?: string;
};

/**
 * Prepares href and state to be used when creating a link to a particular meeting in the calendar.
 *
 * If the meeting is provided as basic data and the link is opened in the same window, the data is passed
 * through location state to avoid fetching it again. If only meeting id is provided, or if the link is
 * opened in a new window, the calendar takes the meeting id from the query string and fetches its data.
 */
export function getMeetingLinkData(calendarHref: string, meeting: string | MeetingBasicData) {
  const meetingId = typeof meeting === "string" ? meeting : meeting.id;
  const meetingBasicData = typeof meeting === "string" ? undefined : meeting;
  return {
    href: `${calendarHref}?${new URLSearchParams({meetingId} satisfies CalendarSearchParams)}`,
    state: {
      meetingToShow:
        meetingBasicData &&
        toPlainObject(meetingBasicData, ["id", "date", "startDayminute", "durationMinutes", "staff", "resources"]),
    } satisfies CalendarLocationState,
  } satisfies Partial<AnchorProps>;
}
