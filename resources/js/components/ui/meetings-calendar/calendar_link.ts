import {AnchorProps} from "@solidjs/router";
import {toPlainObject} from "components/utils/object_util";
import {MeetingBasicData} from "features/meeting/meeting_basic_data";
import {DateTime} from "luxon";
import {CalendarMode} from "./calendar_modes";

export interface CalendarLocationState {
  readonly meetingToShow?: MeetingBasicData;
}

export type CalendarView = {
  readonly mode?: CalendarMode;
  readonly date?: DateTime;
  readonly resources?: readonly string[];
};

export type CalendarViewSearchParams = {
  readonly mode?: CalendarMode;
  readonly date?: string;
  readonly resources?: string;
};
export type CalendarMeetingSearchParams = {
  readonly meetingId: string;
};

export type CalendarSearchParams = Partial<CalendarViewSearchParams | CalendarMeetingSearchParams>;

/** Prepared href for a particular view of a calendar page. */
export function getCalendarViewLinkData(calendarHref: string, view: CalendarView) {
  const params = new URLSearchParams();
  if (view.mode) {
    params.set("mode", view.mode);
  }
  if (view.date) {
    params.set("date", view.date.toISODate());
  }
  if (view.resources) {
    params.set("resources", view.resources.join(","));
  }
  return {href: `${calendarHref}?${params}`} satisfies Partial<AnchorProps>;
}

/**
 * Prepares href and state to be used when creating a link to a particular entity or meeting in the calendar.
 *
 * If the meeting is provided as basic data and the link is opened in the same window, the data is passed
 * through location state to avoid fetching it again. If only meeting id is provided, or if the link is
 * opened in a new window, the calendar takes the meeting id from the query string and fetches its data.
 */
export function getMeetingLinkData(calendarHref: string, meeting: string | MeetingBasicData) {
  const [meetingId, meetingBasicData] = typeof meeting === "string" ? [meeting, undefined] : [meeting.id, meeting];
  return {
    href: `${calendarHref}?${new URLSearchParams({meetingId} satisfies CalendarSearchParams)}`,
    state: {
      meetingToShow:
        meetingBasicData &&
        toPlainObject(meetingBasicData, [
          "id",
          "typeDictId",
          "date",
          "startDayminute",
          "durationMinutes",
          "staff",
          "resources",
        ]),
    } satisfies CalendarLocationState,
  } satisfies Partial<AnchorProps>;
}
