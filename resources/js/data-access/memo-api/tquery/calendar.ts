import {CreateQueryResult} from "@tanstack/solid-query";
import {AxiosError} from "axios";
import {DaysRange} from "components/ui/calendar/days_range";
import {NON_NULLABLE} from "components/utils";
import {Accessor, createMemo, on} from "solid-js";
import {MeetingAttendantResource, MeetingResource} from "../resources/meeting.resource";
import {Api} from "../types";
import {dateToISO} from "../utils";
import {FilterH, FilterReductor} from "./filter_utils";
import {RequestCreator} from "./tquery";
import {DataRequest, DataResponse} from "./types";

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
] satisfies (keyof MeetingResource)[];

/** A meeting resource type fetched from tquery. */
export type TQMeetingResource = Pick<MeetingResource, Exclude<(typeof COLUMNS)[number], "staff" | "clients">> & {
  readonly staff: readonly TQMeetingAttendantResource[];
  readonly clients: readonly TQMeetingAttendantResource[];
};

interface TQMeetingAttendantResource extends MeetingAttendantResource {
  readonly name: string;
}

/**
 * Creates a request creator used by a calendar.
 *
 * TODO: Optimise to avoid loading data that is already cached, maybe load a full month at once if
 * only one staff member is selected etc.
 */
export function createCalendarRequestCreator({
  intrinsicFilter,
  daysRange,
  staff,
  limit = DEFAULT_LIMIT,
}: {
  intrinsicFilter?: FilterH;
  daysRange: Accessor<DaysRange>;
  staff?: Accessor<readonly Api.Id[] | undefined>;
  limit?: number;
}): RequestCreator<undefined> {
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
      ],
    });
    const staffFilter = (): FilterH | undefined => {
      const staffIds = staff?.();
      return (
        staffIds && {
          type: "column",
          column: "staff.*.userId",
          op: "has_any",
          val: staffIds.toSorted(),
        }
      );
    };
    const request = createMemo((): DataRequest | undefined => {
      if (!schema()) {
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

export function meetingsFromQuery(query: CreateQueryResult<DataResponse, AxiosError<Api.ErrorResponse>>) {
  return () => query.data?.data as readonly TQMeetingResource[] | undefined;
}
