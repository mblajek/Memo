import {addDays, holidayFreeWeekStart} from "../dates.ts";
import {createdId} from "../responses.ts";
import {STAFF_ADMIN, facilityLayer, type FacilityArtifact} from "./facility.ts";

/** Minutes of the day. */
const H = 60;
export const ALL_DAY = {startDayminute: 0, durationMinutes: 24 * H} as const;

export const STAFF_LEAVE_NOTES = "E2E staff holiday";
export const FACILITY_LEAVE_NOTES = "E2E facility closed";
export const STAFF_ADMIN_LEAVE_NOTES = "E2E dentist";
export const STAFF_MONDAY_NOTES = "E2E morning shift";

export type TimeTableEntry = {
  readonly id: string;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
};

export type TimeTablesArtifact = FacilityArtifact & {
  /**
   * The Monday of the seeded week: the first week after the current one that has no public holiday,
   * and none in the week after it either.
   */
  readonly weekDate: string;
  /** Facility-wide work times, 8:00–16:00 from Monday to Friday. */
  readonly facilityWorkTimes: readonly TimeTableEntry[];
  /**
   * STAFF's work times, in the order of time: Monday 9:00–15:00 (with notes) and 16:00–18:00,
   * Tuesday and Wednesday 9:00–15:00. 20 hours in total.
   */
  readonly staffWorkTimes: readonly TimeTableEntry[];
  /** STAFF_ADMIN's work time: Thursday 10:00–14:00. */
  readonly staffAdminWorkTime: TimeTableEntry;
  /** STAFF's leave time: all of Thursday. */
  readonly staffLeaveTime: TimeTableEntry;
  /** STAFF_ADMIN's leave time: Tuesday 12:00–14:00. */
  readonly staffAdminLeaveTime: TimeTableEntry;
  /** Facility-wide leave time: all of Friday. */
  readonly facilityLeaveTime: TimeTableEntry;
};

/**
 * Adds time tables to a week soon after the current one: work times and leave times, facility-wide
 * and of staff members. They are meetings of the fixed types `work_time` and `leave_time`, without
 * clients; a facility-wide one has no staff either.
 *
 * Everything is in one week, away from today and from public holidays (the app marks them, and
 * skips them when copying a week), so that the tests do not depend on the day they are run on.
 */
export const timeTablesLayer = facilityLayer.createSubLayer<TimeTablesArtifact>(
  "Time Tables",
  async ({api, parentArtifact}) => {
    await api.login(STAFF_ADMIN);
    const {meetingType, meetingStatus, attendanceStatus} = await api.dictionaries();
    const {facilityId, staffUserId, staffAdminUserId} = parentArtifact;
    const weekDate = holidayFreeWeekStart(2);

    async function create(
      type: "work_time" | "leave_time",
      staffId: string | undefined,
      weekday: number,
      time: {readonly startDayminute: number; readonly durationMinutes: number},
      notes?: string,
    ): Promise<TimeTableEntry> {
      const date = addDays(weekDate, weekday);
      const res = await api.createMeeting(facilityId, {
        typeDictId: meetingType![type]!,
        date,
        ...time,
        statusDictId: meetingStatus!.planned!,
        notes: notes ?? null,
        staff: staffId ? [{userId: staffId, attendanceStatusDictId: attendanceStatus!.ok!}] : [],
      });
      return {id: await createdId(res), date, ...time};
    }

    const [MON, TUE, WED, THU, FRI] = [0, 1, 2, 3, 4];
    const facilityWorkTimes: TimeTableEntry[] = [];
    for (const weekday of [MON, TUE, WED, THU, FRI]) {
      facilityWorkTimes.push(
        await create("work_time", undefined, weekday, {startDayminute: 8 * H, durationMinutes: 8 * H}),
      );
    }
    const staffShift = {startDayminute: 9 * H, durationMinutes: 6 * H};
    const staffWorkTimes = [
      await create("work_time", staffUserId, MON, staffShift, STAFF_MONDAY_NOTES),
      await create("work_time", staffUserId, MON, {startDayminute: 16 * H, durationMinutes: 2 * H}),
      await create("work_time", staffUserId, TUE, staffShift),
      await create("work_time", staffUserId, WED, staffShift),
    ];
    const staffAdminWorkTime = await create("work_time", staffAdminUserId, THU, {
      startDayminute: 10 * H,
      durationMinutes: 4 * H,
    });
    const staffLeaveTime = await create("leave_time", staffUserId, THU, ALL_DAY, STAFF_LEAVE_NOTES);
    const staffAdminLeaveTime = await create(
      "leave_time",
      staffAdminUserId,
      TUE,
      {startDayminute: 12 * H, durationMinutes: 2 * H},
      STAFF_ADMIN_LEAVE_NOTES,
    );
    const facilityLeaveTime = await create("leave_time", undefined, FRI, ALL_DAY, FACILITY_LEAVE_NOTES);

    return {
      ...parentArtifact,
      weekDate,
      facilityWorkTimes,
      staffWorkTimes,
      staffAdminWorkTime,
      staffLeaveTime,
      staffAdminLeaveTime,
      facilityLeaveTime,
    };
  },
);
