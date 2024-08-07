import {DaysRange} from "components/ui/calendar/days_range";
import {CalendarFunction} from "components/ui/meetings-calendar/calendar_modes";
import {Accessor, createMemo, on} from "solid-js";
import {useFixedDictionaries} from "../fixed_dictionaries";
import {MeetingAttendantResource, MeetingResource} from "../resources/meeting.resource";
import {Api} from "../types";
import {dateToISO} from "../utils";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {DataRequest} from "./types";

const DEFAULT_LIMIT = 1000;

const RESOURCE_COLUMNS = [
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

/** The list of columns to fetch. */
const COLUMNS = [...RESOURCE_COLUMNS, "isFacilityWide", "seriesNumber", "seriesCount"] as const;

export type SeriesNumberAndCount = {
  readonly seriesNumber: number | null;
  readonly seriesCount: number | null;
};

/** A meeting resource type fetched from tquery. */
export type TQMeetingResource = Pick<MeetingResource, Exclude<(typeof RESOURCE_COLUMNS)[number], "staff" | "clients">> &
  SeriesNumberAndCount & {
    readonly isFacilityWide: boolean;
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
  intrinsicFilter = "always",
  daysRange,
  staff,
  meetingResources,
  limit = DEFAULT_LIMIT,
}: {
  calendarFunction: CalendarFunction;
  intrinsicFilter?: FilterH;
  daysRange: Accessor<DaysRange>;
  staff: Accessor<readonly Api.Id[]>;
  meetingResources: Accessor<readonly Api.Id[]>;
  limit?: number;
}): RequestCreator<undefined> {
  const {dictionaries, meetingTypeDict} = useFixedDictionaries();
  return (schema) => {
    const filterReductor = createMemo(on(schema, (schema) => schema && new FilterReductor(schema)));
    const filter = () => {
      if (!dictionaries() || !filterReductor()) {
        return "never";
      }
      const dateFilter: FilterH = {
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
        ],
      };
      const typeFilter: FilterH =
        calendarFunction === "work"
          ? "always"
          : calendarFunction === "timeTables"
            ? {
                type: "column",
                column: "typeDictId",
                op: "in",
                val: [meetingTypeDict()!.work_time.id, meetingTypeDict()!.leave_time.id],
              }
            : (calendarFunction satisfies never);
      let staffAndMeetingResourcesFilter: FilterH;
      // Fetch for all staff and resources if showing a single day.
      if (daysRange().length() <= 1) {
        staffAndMeetingResourcesFilter = "always";
      } else {
        if (staff().length || meetingResources().length) {
          staffAndMeetingResourcesFilter = {
            type: "op",
            op: "|",
            val: [
              // Show facility wide meetings only if any staff is selected.
              staff().length ? {type: "column", column: "isFacilityWide", op: "=", val: true} : "never",
              {type: "column", column: "staff.*.userId", op: "has_any", val: staff().toSorted()},
              {type: "column", column: "resources.*.dictId", op: "has_any", val: meetingResources().toSorted()},
            ],
          };
        } else {
          // No staff and no resources requested, so nothing to show.
          staffAndMeetingResourcesFilter = "never";
        }
      }
      return filterReductor()!.reduce({
        type: "op",
        op: "&",
        val: [intrinsicFilter, dateFilter, typeFilter, staffAndMeetingResourcesFilter],
      });
    };
    const request = createMemo((): DataRequest | undefined => {
      if (!schema() || !meetingTypeDict()) {
        return undefined;
      }
      return {
        columns: COLUMNS.map((column) => ({type: "column", column})),
        filter: filter(),
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
