import {AnchorProps} from "@solidjs/router";
import {Modifiable} from "components/utils/modifiable";
import {toPlainObject} from "components/utils/object_util";
import {MeetingBasicData} from "features/meeting/meeting_basic_data";
import {DateTime} from "luxon";
import {CalendarMode} from "./calendar_modes";

export interface CalendarLocationState {
  readonly meetingToShow?: MeetingBasicData;
}

export type CalendarSearchParams = {
  /** Calendar mode or comma-separated acceptable calendar modes. */
  readonly mode?: string;
  readonly date?: string;
  readonly resources?: string;
  readonly meetingId?: string;
};

/**
 * Prepares href and state to be used when creating a link to a particular view or meeting in the calendar.
 *
 * If the meeting is provided as basic data and the link is opened in the same window, the data is passed
 * through location state to avoid fetching it again. If only meeting id is provided, or if the link is
 * opened in a new window, the calendar takes the meeting id from the query string and fetches its data.
 */
export function getCalendarViewLinkData(
  calendarHref: string,
  {
    mode,
    date,
    resources,
    meeting,
  }: {
    mode?: CalendarMode | readonly CalendarMode[];
    date?: DateTime;
    resources?: readonly string[];
    meeting?: string | MeetingBasicData;
  },
) {
  const params: Modifiable<CalendarSearchParams> = {};
  let state: CalendarLocationState | undefined;
  if (mode) {
    params.mode = typeof mode === "string" ? mode : mode.join(",");
  }
  if (date) {
    params.date = date.toISODate();
  }
  if (resources) {
    params.resources = resources.join(",");
  }
  if (meeting) {
    const [meetingId, meetingBasicData] = typeof meeting === "string" ? [meeting, undefined] : [meeting.id, meeting];
    params.meetingId = meetingId;
    if (meetingBasicData) {
      state = {
        meetingToShow: toPlainObject(meetingBasicData, [
          "id",
          "typeDictId",
          "date",
          "startDayminute",
          "durationMinutes",
          "staff",
          "resources",
        ]),
      };
    }
  }
  return {href: `${calendarHref}?${new URLSearchParams(params)}`, state} satisfies Partial<AnchorProps>;
}
