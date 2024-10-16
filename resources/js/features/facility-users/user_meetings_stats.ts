import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {DateTime} from "luxon";
import {Accessor, createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {FacilityUserType} from "./user_types";

export interface UserMeetingsStats {
  readonly firstMeetingDate: DateTime | undefined;
  readonly lastMeetingDate: DateTime | undefined;
  readonly completedMeetingsCount: number;
  readonly completedMeetingsCountLastMonth: number;
  readonly plannedMeetingsCount: number;
  readonly plannedMeetingsCountNextMonth: number;
}

export function useUserMeetingsStats(
  type: FacilityUserType,
  userId: Accessor<string>,
): Accessor<UserMeetingsStats | undefined> {
  const {dataQuery} = createTQuery({
    entityURL: () =>
      activeFacilityId() &&
      `facility/${activeFacilityId()}/user/${type === "staff" ? "staff" : type === "clients" ? "client" : (type satisfies never)}`,
    prefixQueryKey: [...FacilityMeeting.keys.meeting(), "userStats"],
    requestCreator: staticRequestCreator(() => ({
      columns: [
        {type: "column", column: "firstMeetingDate"},
        {type: "column", column: "lastMeetingDate"},
        {type: "column", column: "completedMeetingsCount"},
        {type: "column", column: "completedMeetingsCountLastMonth"},
        {type: "column", column: "plannedMeetingsCount"},
        {type: "column", column: "plannedMeetingsCountNextMonth"},
      ],
      filter: {
        type: "column",
        column: "id",
        op: "=",
        val: userId(),
      },
      sort: [],
      paging: {size: 1},
    })),
  });
  function toDate(field: string | null) {
    return field ? DateTime.fromISO(field) : undefined;
  }
  const stats = createMemo(() => {
    const row = dataQuery.data?.data[0];
    if (!row) {
      return undefined;
    }
    return {
      firstMeetingDate: toDate(row.firstMeetingDate as string),
      lastMeetingDate: toDate(row.lastMeetingDate as string),
      completedMeetingsCount: row.completedMeetingsCount as number,
      completedMeetingsCountLastMonth: row.completedMeetingsCountLastMonth as number,
      plannedMeetingsCount: row.plannedMeetingsCount as number,
      plannedMeetingsCountNextMonth: row.plannedMeetingsCountNextMonth as number,
    } satisfies UserMeetingsStats;
  });
  return stats;
}
