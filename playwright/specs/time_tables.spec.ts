import {meetingConflicts} from "../helpers/queries.ts";
import {addDays} from "../lib/dates.ts";
import {ADMIN, BARE_MEMBER, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {
  ALL_DAY,
  FACILITY_LEAVE_NOTES,
  STAFF_LEAVE_NOTES,
  STAFF_MONDAY_NOTES,
  timeTablesLayer,
  type TimeTablesArtifact,
} from "../lib/layers/time_tables.ts";
import {createdId, expectValidationError, responseData} from "../lib/responses.ts";
import {MemoAPI, expect, readOnlyTest, test} from "../lib/test.ts";

/**
 * API tests of time tables: work times and leave times, which are meetings of the fixed types
 * `work_time` and `leave_time` — of a staff member, or facility-wide (no staff).
 */

interface TimeTableRow {
  readonly id: string;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
  readonly typeDictId: string;
  readonly categoryDictId: string;
  readonly notes: string | null;
  readonly isFacilityWide: boolean;
  readonly fromMeetingId: string | null;
  readonly interval: string | null;
}

const ROW_COLUMNS = [
  "id",
  "date",
  "startDayminute",
  "durationMinutes",
  "typeDictId",
  "categoryDictId",
  "notes",
  "isFacilityWide",
  "fromMeetingId",
  "interval",
] as const;

type Scope = {readonly staffId: string; readonly withFacilityWide?: boolean} | "facilityWide";

/**
 * The work times and leave times in the given range of dates, in the order of time. The filter is
 * the one of the time tables pages: the entries of a staff member (by default with the
 * facility-wide ones), or the facility-wide ones only.
 */
async function timeTable(
  api: MemoAPI,
  facilityId: string,
  scope: Scope,
  [fromDate, toDate]: readonly [string, string],
): Promise<readonly TimeTableRow[]> {
  const {meetingType} = await api.dictionaries();
  const isFacilityWide = {type: "column", column: "isFacilityWide", op: "=", val: true};
  const ofStaff =
    scope === "facilityWide" ? undefined : {type: "column", column: "staff.*.userId", op: "has", val: scope.staffId};
  return (
    await api.tquery<TimeTableRow>(`facility/${facilityId}/meeting/tquery`, {
      columns: ROW_COLUMNS,
      filter: {
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "typeDictId", op: "in", val: [meetingType!.work_time!, meetingType!.leave_time!]},
          ofStaff
            ? scope !== "facilityWide" && scope.withFacilityWide === false
              ? ofStaff
              : {type: "op", op: "|", val: [ofStaff, isFacilityWide]}
            : isFacilityWide,
          {type: "column", column: "date", op: ">=", val: fromDate},
          {type: "column", column: "date", op: "<=", val: toDate},
        ],
      },
      sort: [{column: "date"}, {column: "startDayminute"}, {column: "durationMinutes"}],
    })
  ).rows;
}

function week(artifact: TimeTablesArtifact, weekOffset = 0): readonly [string, string] {
  const start = addDays(artifact.weekDate, 7 * weekOffset);
  return [start, addDays(start, 6)];
}

/** The part of a row that says when it is: for comparing entries of different weeks. */
function times(rows: readonly Pick<TimeTableRow, "date" | "startDayminute" | "durationMinutes">[], dayShift = 0) {
  return rows.map(({date, startDayminute, durationMinutes}) => ({
    date: addDays(date, dayShift),
    startDayminute,
    durationMinutes,
  }));
}

timeTablesLayer.describe((artifact) => {
  readOnlyTest("seeded time tables are listed per staff member and facility-wide", async ({api}) => {
    const a = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const {meetingType, meetingCategory} = await adminApi.dictionaries();
    const workTime = meetingType!.work_time!;
    const leaveTime = meetingType!.leave_time!;

    const facilityWide = await timeTable(adminApi, a.facilityId, "facilityWide", week(a));
    // In the order of time: the all-day leave time of Friday comes before that day's work time.
    expect(facilityWide.map(({id}) => id)).toEqual([
      ...a.facilityWorkTimes.slice(0, 4).map(({id}) => id),
      a.facilityLeaveTime.id,
      a.facilityWorkTimes[4]!.id,
    ]);
    for (const row of facilityWide) {
      expect(row.isFacilityWide, row.id).toBe(true);
      // Both types are in the system category, which is what keeps them out of the meetings lists.
      expect(row.categoryDictId, row.id).toBe(meetingCategory!.system!);
    }
    expect(facilityWide.at(-2)).toMatchObject({typeDictId: leaveTime, ...ALL_DAY, notes: FACILITY_LEAVE_NOTES});

    const ofStaff = await timeTable(adminApi, a.facilityId, {staffId: a.staffUserId, withFacilityWide: false}, week(a));
    expect(ofStaff.map(({id}) => id)).toEqual([...a.staffWorkTimes.map(({id}) => id), a.staffLeaveTime.id]);
    expect(ofStaff.map(({isFacilityWide}) => isFacilityWide)).toEqual(ofStaff.map(() => false));
    expect(ofStaff[0]).toMatchObject({
      typeDictId: workTime,
      startDayminute: 540,
      durationMinutes: 360,
      notes: STAFF_MONDAY_NOTES,
    });
    expect(ofStaff.at(-1)).toMatchObject({typeDictId: leaveTime, ...ALL_DAY, notes: STAFF_LEAVE_NOTES});
    expect(
      ofStaff.filter((row) => row.typeDictId === workTime).reduce((sum, row) => sum + row.durationMinutes, 0),
    ).toBe(20 * 60);

    // What the pages ask for: the staff member's entries together with the facility-wide ones.
    const withFacilityWide = await timeTable(adminApi, a.facilityId, {staffId: a.staffAdminUserId}, week(a));
    expect(withFacilityWide.map(({id}) => id).toSorted()).toEqual(
      [...facilityWide.map(({id}) => id), a.staffAdminWorkTime.id, a.staffAdminLeaveTime.id].toSorted(),
    );
    // Nothing outside the seeded week.
    expect(await timeTable(adminApi, a.facilityId, {staffId: a.staffUserId}, week(a, 1))).toEqual([]);
    expect(await timeTable(adminApi, a.facilityId, {staffId: a.staffUserId}, week(a, -1))).toEqual([]);
  });

  readOnlyTest("time tables stay out of the meetings conflicts", async ({api}) => {
    const a = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    // STAFF is on leave all of Thursday, and works on Monday from 9:00; neither is a conflict for
    // a meeting — the conflicts are only between meetings proper.
    const conflicts = await meetingConflicts(staffApi, a.facilityId, {
      samples: [
        {date: a.staffLeaveTime.date, startDayminute: 600, durationMinutes: 60},
        {date: a.staffWorkTimes[0]!.date, startDayminute: 600, durationMinutes: 60},
      ],
      staff: true,
    });
    expect(conflicts).toEqual([{staff: []}, {staff: []}]);
  });

  test("a leave time is created, changed and deleted through the meeting endpoints", async ({api}) => {
    const a = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const {meetingType, meetingStatus, attendanceStatus, meetingCategory} = await staffApi.dictionaries();
    const date = addDays(a.weekDate, 7);
    const id = await createdId(
      await staffApi.createMeeting(a.facilityId, {
        typeDictId: meetingType!.leave_time!,
        date,
        ...ALL_DAY,
        statusDictId: meetingStatus!.planned!,
        notes: "sick leave",
        staff: [{userId: a.staffUserId, attendanceStatusDictId: attendanceStatus!.ok!}],
      }),
    );
    const scope = {staffId: a.staffUserId, withFacilityWide: false};
    expect(await timeTable(staffApi, a.facilityId, scope, week(a, 1))).toEqual([
      expect.objectContaining({
        id,
        date,
        ...ALL_DAY,
        typeDictId: meetingType!.leave_time!,
        categoryDictId: meetingCategory!.system!,
        notes: "sick leave",
        isFacilityWide: false,
      }),
    ]);

    // To a part of the next day.
    await staffApi.patchMeeting(a.facilityId, id, {
      date: addDays(date, 1),
      startDayminute: 720,
      durationMinutes: 120,
      notes: null,
    });
    expect(await timeTable(staffApi, a.facilityId, scope, week(a, 1))).toEqual([
      expect.objectContaining({id, date: addDays(date, 1), startDayminute: 720, durationMinutes: 120, notes: null}),
    ]);

    // Without the staff member it becomes facility-wide.
    await staffApi.patchMeeting(a.facilityId, id, {staff: []});
    expect(await timeTable(staffApi, a.facilityId, scope, week(a, 1))).toEqual([]);
    expect(await timeTable(staffApi, a.facilityId, "facilityWide", week(a, 1))).toEqual([
      expect.objectContaining({id, isFacilityWide: true}),
    ]);

    await staffApi.delete(`facility/${a.facilityId}/meeting/${id}`);
    expect(await timeTable(staffApi, a.facilityId, "facilityWide", week(a, 1))).toEqual([]);
  });

  readOnlyTest("a time starting outside the day, too short or longer than a day is rejected", async ({api}) => {
    const a = artifact();
    const adminApi = await api.loggedInAs(STAFF_ADMIN);
    const {meetingType, meetingStatus} = await adminApi.dictionaries();
    const base = {
      typeDictId: meetingType!.leave_time!,
      date: addDays(a.weekDate, 7),
      statusDictId: meetingStatus!.planned!,
    };
    await expectValidationError(
      await adminApi.createMeeting(
        a.facilityId,
        {...base, startDayminute: 1440, durationMinutes: 60},
        {allowFailure: true},
      ),
      {field: "startDayminute", code: "validation.max.numeric"},
    );
    await expectValidationError(
      await adminApi.createMeeting(
        a.facilityId,
        {...base, startDayminute: 0, durationMinutes: 0},
        {allowFailure: true},
      ),
      {field: "durationMinutes", code: "validation.min.numeric"},
    );
    await expectValidationError(
      await adminApi.createMeeting(
        a.facilityId,
        {...base, startDayminute: 0, durationMinutes: 1441},
        {allowFailure: true},
      ),
      {field: "durationMinutes", code: "validation.max.numeric"},
    );
    expect(await timeTable(adminApi, a.facilityId, "facilityWide", week(a, 1))).toEqual([]);
  });

  test("work times of a week are copied to other weeks by cloning, and deleted in one request", async ({api}) => {
    // The two requests the weekly time tables page is built on.
    const a = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const scope = {staffId: a.staffUserId, withFacilityWide: false};
    const source = a.staffWorkTimes;

    const cloneIds: string[] = [];
    for (const {id, date} of source) {
      const res = await adminApi.post(`facility/${a.facilityId}/meeting/${id}/clone`, {
        dates: [addDays(date, 14), addDays(date, 21)],
        interval: null,
      });
      cloneIds.push(...(await responseData<{ids: string[]}>(res)).ids);
    }
    expect(cloneIds).toHaveLength(2 * source.length);
    for (const weekOffset of [2, 3]) {
      const rows = await timeTable(adminApi, a.facilityId, scope, week(a, weekOffset));
      expect(times(rows), `week +${weekOffset}`).toEqual(times(source, 7 * weekOffset));
      // The notes go with the copy.
      expect(rows[0]!.notes).toBe(STAFF_MONDAY_NOTES);
    }
    // The leave time of the source week is not a part of it, and the week between is untouched.
    expect(await timeTable(adminApi, a.facilityId, scope, week(a, 1))).toEqual([]);

    // Delete the copies of the first target week; the id in the URL is repeated in `otherIds`.
    const toDelete = (await timeTable(adminApi, a.facilityId, scope, week(a, 2))).map(({id}) => id);
    const deleteRes = await adminApi.delete(`facility/${a.facilityId}/meeting/${toDelete[0]}`, {otherIds: toDelete});
    expect((await responseData<{count: number}>(deleteRes)).count).toBe(toDelete.length);
    expect(await timeTable(adminApi, a.facilityId, scope, week(a, 2))).toEqual([]);
    expect(await timeTable(adminApi, a.facilityId, scope, week(a, 3))).toHaveLength(source.length);
    expect(await timeTable(adminApi, a.facilityId, scope, week(a))).toHaveLength(source.length + 1);
  });

  readOnlyTest("time tables are closed to a member without a role, and to an anonymous caller", async ({api}) => {
    const a = artifact();
    const {meetingType, meetingStatus} = await api.dictionaries();
    const body = {
      typeDictId: meetingType!.work_time!,
      date: addDays(a.weekDate, 7),
      startDayminute: 480,
      durationMinutes: 60,
      statusDictId: meetingStatus!.planned!,
    };
    const bareApi = await api.loggedInAs(BARE_MEMBER);
    for (const [caller, status] of [
      [bareApi, 403],
      [api, 401],
    ] as const) {
      expect((await caller.createMeeting(a.facilityId, body, {allowFailure: true})).status()).toBe(status);
      expect(
        (
          await caller.patchMeeting(a.facilityId, a.facilityWorkTimes[0]!.id, {notes: "x"}, {allowFailure: true})
        ).status(),
      ).toBe(status);
      expect(
        (
          await caller.delete(`facility/${a.facilityId}/meeting/${a.staffLeaveTime.id}`, undefined, {
            allowFailure: true,
          })
        ).status(),
      ).toBe(status);
    }
    const adminApi = await api.loggedInAs(ADMIN);
    expect(await timeTable(adminApi, a.facilityId, "facilityWide", week(a, 1))).toEqual([]);
    expect(await timeTable(adminApi, a.facilityId, "facilityWide", week(a))).toHaveLength(
      a.facilityWorkTimes.length + 1,
    );
  });
});
