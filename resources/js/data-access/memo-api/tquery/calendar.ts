import {DaysRange} from "components/ui/calendar/days_range";
import {CalendarFunction} from "components/ui/meetings-calendar/calendar_modes";
import {NON_NULLABLE} from "components/utils";
import {Accessor, createMemo, on} from "solid-js";
import {useFixedDictionaries} from "../fixed_dictionaries";
import {MeetingAttendantResource, MeetingResource} from "../resources/meeting.resource";
import {Api} from "../types";
import {dateToISO} from "../utils";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {DataRequest} from "./types";

const DEFAULT_LIMIT = 1000;

/** The list of columns to fetch. */
const COLUMNS = [
  "id",
  "date",
  "startDayminute",
  "durationMinutes",
  "categoryDictId",
  "typeDictId",
  "statusDictId",
  "staff",
  "clients",
  "resources",
  "notes",
  "isRemote",
  "fromMeetingId",
  "interval",
] as const satisfies (keyof MeetingResource)[];

/** A meeting resource type fetched from tquery. */
export type TQMeetingResource = Pick<MeetingResource, Exclude<(typeof COLUMNS)[number], "staff" | "clients">> & {
  readonly staff: readonly TQMeetingAttendantResource[];
  readonly clients: readonly TQMeetingAttendantResource[];
};

export interface TQMeetingAttendantResource extends MeetingAttendantResource {
  readonly name: string;
  readonly attendanceTypeDictId: string;
}

/**
 * Creates a request creator used by a calendar.
 *
 * TODO: Optimise to avoid loading data that is already cached, maybe load a full month at once if
 * only one staff member is selected etc.
 */
export function createCalendarRequestCreator({
  calendarFunction,
  intrinsicFilter,
  daysRange,
  staff,
  limit = DEFAULT_LIMIT,
}: {
  calendarFunction: CalendarFunction;
  intrinsicFilter?: FilterH;
  daysRange: Accessor<DaysRange>;
  staff?: Accessor<readonly Api.Id[] | undefined>;
  limit?: number;
}): RequestCreator<undefined> {
  const {meetingTypeDict} = useFixedDictionaries();
  return (schema) => {
    const filterReductor = createMemo(on(schema, (schema) => schema && new FilterReductor(schema)));
    const dateFilter = (): FilterH => ({
      type: "op",
      op: "&",
      val: [
        {
          type: "column",
          column: "date",
          op: ">=",
          val: dateToISO(daysRange().start.minus({days: 1})),
        },
        {
          type: "column",
          column: "date",
          op: "<=",
          val: dateToISO(daysRange().end),
        },
        ...(calendarFunction === "work"
          ? []
          : calendarFunction === "timeTables"
            ? meetingTypeDict()
              ? ([
                  {
                    type: "column",
                    column: "typeDictId",
                    op: "in",
                    val: [meetingTypeDict()!.work_time.id, meetingTypeDict()!.leave_time.id],
                  },
                ] as const)
              : []
            : (calendarFunction satisfies never)),
      ],
    });
    const staffFilter = (): FilterH | undefined => {
      // Fetch for all staff if showing a single day.
      if (daysRange().length() <= 1) {
        return undefined;
      }
      const staffIds = staff?.();
      const hasStaffFilter: FilterH | undefined = staffIds && {
        type: "column",
        column: "staff.*.userId",
        op: "has_any",
        val: staffIds.toSorted(),
      };
      const isFacilityWide: FilterH = {type: "column", column: "staff.count", op: "=", val: 0};
      return {
        type: "op",
        op: "|",
        val: [hasStaffFilter, isFacilityWide].filter(NON_NULLABLE),
      };
    };
    const request = createMemo((): DataRequest | undefined => {
      if (!schema() || !meetingTypeDict()) {
        return undefined;
      }
      return {
        columns: COLUMNS.map((column) => ({type: "column", column})),
        filter: filterReductor()?.reduce({
          type: "op",
          op: "&",
          val: [intrinsicFilter, dateFilter(), staffFilter()].filter(NON_NULLABLE),
        }),
        sort: [],
        paging: {size: limit},
      };
    });
    return {
      request,
      requestController: undefined,
    };
  };
}
