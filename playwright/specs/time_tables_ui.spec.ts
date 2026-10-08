import {checkedSeriesDates} from "../helpers/meetings.ts";
import type {Locator, Page} from "@playwright/test";
import {expectCalendarMode} from "../helpers/calendar.ts";
import {addDays, firstAppHolidayFrom, isAppHoliday, mondayOf} from "../lib/dates.ts";
import {ADMIN, FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {
  FACILITY_LEAVE_NOTES,
  STAFF_ADMIN_LEAVE_NOTES,
  STAFF_LEAVE_NOTES,
  STAFF_MONDAY_NOTES,
  timeTablesLayer,
} from "../lib/layers/time_tables.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {createdId, responseData} from "../lib/responses.ts";
import {
  allTableRows,
  expectFormSuccess,
  expectSectionShown,
  formField,
  submitButton,
  tableCell,
} from "../helpers/selectors.ts";
import {expect, login, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * UI tests of time tables: the facility admin's weekly time tables page and time tables calendar,
 * the staff absences page, and how work times and leave times show in the facility calendar.
 */

// The weeks of the pages follow the browser's locale; in the Polish one they start on Monday, the
// way the dates helpers and the time tables layer count them.
test.use({locale: "pl-PL"});

const WEEKLY = "facility_user.weekly_time_tables";
const [MON, TUE, WED, THU, FRI, SAT, SUN] = [0, 1, 2, 3, 4, 5, 6] as const;

interface WorkTime {
  readonly id: string;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
  readonly notes: string | null;
  readonly isFacilityWide: boolean;
}

/** The work times (not the leave times) of the staff member, or of the facility, in the week. */
async function workTimes(api: MemoAPI, facilityId: string, staffId: string | undefined, weekDate: string) {
  const {meetingType} = await api.dictionaries();
  return (
    await api.tquery<WorkTime>(`facility/${facilityId}/meeting/tquery`, {
      columns: ["id", "date", "startDayminute", "durationMinutes", "notes", "isFacilityWide"],
      filter: {
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "typeDictId", op: "=", val: meetingType!.work_time!},
          staffId
            ? {type: "column", column: "staff.*.userId", op: "has", val: staffId}
            : {type: "column", column: "isFacilityWide", op: "=", val: true},
          {type: "column", column: "date", op: ">=", val: weekDate},
          {type: "column", column: "date", op: "<=", val: addDays(weekDate, 6)},
        ],
      },
      sort: [{column: "date"}, {column: "startDayminute"}],
    })
  ).rows;
}

function times(rows: readonly Pick<WorkTime, "date" | "startDayminute" | "durationMinutes">[], dayShift = 0) {
  return rows.map(({date, startDayminute, durationMinutes}) => ({
    date: addDays(date, dayShift),
    startDayminute,
    durationMinutes,
  }));
}

async function createWorkTime(
  api: MemoAPI,
  facilityId: string,
  staffId: string,
  time: {date: string; startDayminute: number; durationMinutes: number},
) {
  const {meetingType, meetingStatus, attendanceStatus} = await api.dictionaries();
  return createdId(
    await api.createMeeting(facilityId, {
      typeDictId: meetingType!.work_time!,
      ...time,
      statusDictId: meetingStatus!.planned!,
      staff: [{userId: staffId, attendanceStatusDictId: attendanceStatus!.ok!}],
    }),
  );
}

/** The weekly time tables page, opened as the facility admin, showing the given selection. */
async function openWeekly(page: Page, staffName?: string) {
  await openPage(page, `/${FACILITY.url}/admin/time-tables/weekly`, ADMIN);
  const main = page.locator("main");
  const selection = main.getByRole("combobox");
  await expect(selection).toContainText("meetings.facility_wide");
  if (staffName) {
    await selection.click();
    await page.getByRole("option", {name: staffName}).click();
    await expect(selection).toContainText(staffName);
  }
  function row(weekDate: string) {
    const locator = allTableRows(main).filter({has: page.locator(`a[href*="date=${weekDate}"]`)});
    return {
      locator,
      /** The entries of the day of the week, counted from Monday. */
      day: (weekday: number) => tableCell(locator, `weekday-${weekday + 1}`),
      total: tableCell(locator, "totalWorkTime"),
      /** Opens the row's menu and clicks the action. */
      async action(name: string) {
        await locator.locator(`title=${WEEKLY}.click_to_see_actions`).click();
        await page.getByRole("button", {name: `${WEEKLY}.${name}`, exact: true}).click();
      },
    };
  }
  return {
    main,
    row,
    weekdayCheckbox: (weekday: number) =>
      main.locator(`[role="columnheader"][data-column="weekday-${weekday + 1}"]`).getByRole("checkbox"),
  };
}

/** The confirmation dialog of a weekly time tables action. */
function weeklyDialog(page: Page, kind: "paste" | "delete") {
  const prefix = `${WEEKLY}.confirmation.${kind}`;
  return {
    heading: page.getByRole("heading", {name: `${prefix}.title`}),
    text: (subkey: string, count?: number) =>
      page.getByText(`${prefix}.${subkey}${count === undefined ? "" : `{count:${count}}`}`, {
        exact: count === undefined,
      }),
    checkbox: (subkey: string) => page.getByRole("checkbox", {name: `${prefix}.target_weeks.${subkey}`}),
    confirm: page.getByRole("button", {name: `${prefix}.confirm`}),
    success: page.getByText(`${WEEKLY}.success`),
  };
}

/**
 * The summaries of the calendar entries of the type with the given hours ("9:00–15:00"). Whether
 * an hour before 10 gets a leading zero is up to the browser.
 */
function entrySummary(main: Locator, type: "work_time" | "facility_work_time", hours: string) {
  return main.locator(
    [hours, hours.replace(/\b\d:/g, "0$&")].map((h) => `[aria-description$="${type}} ${h}" i]`).join(", "),
  );
}

/** The admin's time tables calendar, on the view (by default of the week) of the given staff member. */
async function openTimeTablesCalendar(
  page: Page,
  date: string,
  staffId: string,
  mode: "day" | "week" | "month" = "week",
) {
  await openPage(page, `/${FACILITY.url}/admin/time-tables?${new URLSearchParams({mode, date, resources: staffId})}`);
  const main = page.locator("main");
  return {
    main,
    /** The summaries (in the area above the hours) of the entries with the given hours. */
    summary: (type: "work_time" | "facility_work_time", hours: string) => entrySummary(main, type, hours),
    /** The "add" buttons, one per day column: Monday to Friday. */
    add: (weekday: number) => main.locator("title=actions.add").nth(weekday),
  };
}

function hoursText(from: string, to: string) {
  // Hours before 10:00 are padded with an invisible zero.
  return new RegExp(`^0?${from}–0?${to}$`);
}

async function expectDayEntries(day: Locator, hours: readonly (readonly [string, string])[]) {
  await expect(day.getByRole("listitem")).toHaveText(hours.map(([from, to]) => hoursText(from, to)));
}

timeTablesLayer.describe((artifact) => {
  readOnlyTest(
    "weekly time tables show the facility-wide and the staff member's work times",
    {tag: "@ui"},
    async ({page}) => {
      const {weekDate} = artifact();
      const {main, row} = await openWeekly(page);
      const seeded = row(weekDate);
      const empty = row(addDays(weekDate, 7));

      await test.step("facility-wide", async () => {
        for (const weekday of [MON, TUE, WED, THU, FRI]) {
          await expectDayEntries(seeded.day(weekday), [["8:00", "16:00"]]);
        }
        for (const weekday of [SAT, SUN]) {
          await expect(seeded.day(weekday).getByRole("listitem")).toHaveCount(0);
        }
        await expect(seeded.total).toHaveText("calendar.units.hours{count:40}");
        await expect(
          seeded.day(FRI).locator(`[aria-description*="${WEEKLY}.day_notes.facility_leave_time"]`),
        ).toBeVisible();
        await expect(seeded.day(THU).locator(`[aria-description*="${WEEKLY}.day_notes"]`)).toHaveCount(0);
        await expect(empty.locator.getByRole("listitem")).toHaveCount(0);
        await expect(empty.total).toHaveText("—");
      });

      await test.step("a staff member", async () => {
        await main.getByRole("combobox").click();
        await page.getByRole("option", {name: STAFF.name}).click();
        await expectDayEntries(seeded.day(MON), [
          ["9:00", "15:00"],
          ["16:00", "18:00"],
        ]);
        await expectDayEntries(seeded.day(TUE), [["9:00", "15:00"]]);
        await expectDayEntries(seeded.day(WED), [["9:00", "15:00"]]);
        for (const weekday of [THU, FRI, SAT, SUN]) {
          await expect(seeded.day(weekday).getByRole("listitem")).toHaveCount(0);
        }
        await expect(seeded.total).toHaveText("calendar.units.hours{count:20}");
        // The notes of an entry are in the title of its mark.
        await expect(seeded.day(MON).locator(`title=${STAFF_MONDAY_NOTES}`)).toBeVisible();
        await expect(
          seeded.day(THU).locator(`[aria-description*="${WEEKLY}.day_notes.staff_leave_time"]`),
        ).toBeVisible();
        await expect(
          seeded.day(FRI).locator(`[aria-description*="${WEEKLY}.day_notes.facility_leave_time"]`),
        ).toBeVisible();
        await expect(seeded.locator.locator(`title=${WEEKLY}.overlapping`)).toHaveCount(0);
        await expect(empty.locator.getByRole("listitem")).toHaveCount(0);
      });

      await test.step("another staff member; the selection survives a reload", async () => {
        await main.getByRole("combobox").click();
        await page.getByRole("option", {name: STAFF_ADMIN.name}).click();
        await expectDayEntries(seeded.day(THU), [["10:00", "14:00"]]);
        await expect(seeded.locator.getByRole("listitem")).toHaveCount(1);
        await expect(seeded.total).toHaveText("calendar.units.hours{count:4}");
        await page.reload();
        await disableTranslations(page);
        await expect(main.getByRole("combobox")).toContainText(STAFF_ADMIN.name);
        await expectDayEntries(seeded.day(THU), [["10:00", "14:00"]]);
      });

      await test.step("the week links to the time tables calendar", async () => {
        await seeded.locator.getByRole("link").click();
        await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/admin/time-tables(\\?|$)`));
        await disableTranslations(page);
        await expect(main.getByRole("radio", {name: STAFF_ADMIN.name})).toBeChecked();
        await expect(main.locator('[aria-description$="work_time} 10:00–14:00" i]')).toBeVisible();
      });
    },
  );

  test(
    "touching and overlapping work times are marked in the weekly time tables",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, weekDate} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      // Monday has 9:00–15:00 and 16:00–18:00: add one touching the first and overlapping the second.
      await createWorkTime(adminApi, facilityId, staffUserId, {
        date: weekDate,
        startDayminute: 900,
        durationMinutes: 90,
      });
      const {row} = await openWeekly(page, STAFF.name);
      const monday = row(weekDate).day(MON);
      await expectDayEntries(monday, [
        ["9:00", "15:00"],
        ["15:00", "16:30"],
        ["16:00", "18:00"],
      ]);
      const marks = monday.getByRole("listitem").locator(`title=${WEEKLY}.overlapping`);
      await expect(monday.getByRole("listitem").nth(0).locator(`title=${WEEKLY}.overlapping`)).toHaveCount(0);
      await expect(marks).toHaveCount(2);
      await expect(row(weekDate).total).toHaveText("calendar.duration.hours_minutes{hours:21,minutes:30}");
      await expect(row(weekDate).day(TUE).locator(`title=${WEEKLY}.overlapping`)).toHaveCount(0);
    },
  );

  test(
    "a week's work times are copied to another week, replacing what was there",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, staffWorkTimes, weekDate} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const targetWeek = addDays(weekDate, 7);
      const oldId = await createWorkTime(adminApi, facilityId, staffUserId, {
        date: addDays(targetWeek, SAT),
        startDayminute: 420,
        durationMinutes: 60,
      });
      const {row} = await openWeekly(page, STAFF.name);
      const source = row(weekDate);
      const target = row(targetWeek);
      await expectDayEntries(target.day(SAT), [["7:00", "8:00"]]);

      await source.action("select_week");
      await expect(source.locator.locator(`title=${WEEKLY}.selected_week_click_to_deselect`)).toBeVisible();
      await target.action("paste_here");
      const dialog = weeklyDialog(page, "paste");
      await expect(dialog.heading).toBeVisible();
      await expect(dialog.text("source_week.entries_count", 4)).toBeVisible();
      await expect(page.getByText("calendar.units.weeks{count:1}")).toBeVisible();
      await expectSectionShown(dialog.text("target_weeks.delete_count", 1), true);
      // Holidays are skipped by default; the target week might have one, depending on today's date.
      await dialog.checkbox("skip_holidays").uncheck();
      await expect(dialog.text("target_weeks.paste_count", 4)).toBeVisible();
      await dialog.confirm.click();
      await expect(dialog.success).toBeVisible();
      await expect(dialog.heading).toHaveCount(0);

      // The selection of the source week is dropped once the action is done.
      await expect(source.locator.locator(`title=${WEEKLY}.selected_week_click_to_deselect`)).toHaveCount(0);
      await expectDayEntries(target.day(MON), [
        ["9:00", "15:00"],
        ["16:00", "18:00"],
      ]);
      await expect(target.day(SAT).getByRole("listitem")).toHaveCount(0);
      await expect(target.total).toHaveText("calendar.units.hours{count:20}");
      const copied = await workTimes(adminApi, facilityId, staffUserId, targetWeek);
      expect(times(copied)).toEqual(times(staffWorkTimes, 7));
      expect(copied.map(({id}) => id)).not.toContain(oldId);
      expect(copied[0]!.notes).toBe(STAFF_MONDAY_NOTES);
      // The source week is as it was, and the facility-wide work times were not a part of this.
      expect(times(await workTimes(adminApi, facilityId, staffUserId, weekDate))).toEqual(times(staffWorkTimes));
      expect(await workTimes(adminApi, facilityId, undefined, targetWeek)).toEqual([]);
    },
  );

  test(
    "a week is repeated every second week up to a chosen week, keeping what was there",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, staffWorkTimes, weekDate} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const [week2, week3, week4, week5] = [7, 14, 21, 28].map((days) => addDays(weekDate, days));
      const keptId = await createWorkTime(adminApi, facilityId, staffUserId, {
        date: addDays(week3!, SUN),
        startDayminute: 600,
        durationMinutes: 120,
      });
      const {row} = await openWeekly(page, STAFF.name);
      await row(weekDate).action("select_week");
      await row(week5!).action("paste_until_here");
      const dialog = weeklyDialog(page, "paste");
      await expect(dialog.heading).toBeVisible();
      await dialog.checkbox("skip_holidays").uncheck();
      await expect(page.getByText("calendar.units.weeks{count:4}")).toBeVisible();
      await expect(dialog.text("target_weeks.paste_count", 16)).toBeVisible();
      await expectSectionShown(dialog.text("target_weeks.delete_count", 1), true);

      // Every second week counts from the source week: the second and the fourth week after it.
      await dialog.text("target_weeks.interval.2").click();
      await expect(page.getByText("calendar.units.weeks{count:2}")).toBeVisible();
      await expect(dialog.text("target_weeks.paste_count", 8)).toBeVisible();
      await dialog.checkbox("delete_existing").uncheck();
      await expectSectionShown(dialog.text("target_weeks.no_delete_existing"), true);
      await dialog.confirm.click();
      await expect(dialog.success).toBeVisible();

      await expect(row(week3!).total).toHaveText("calendar.units.hours{count:22}");
      await expect(row(week5!).total).toHaveText("calendar.units.hours{count:20}");
      await expect(row(week2!).total).toHaveText("—");
      await expect(row(week4!).total).toHaveText("—");
      expect(await workTimes(adminApi, facilityId, staffUserId, week2!)).toEqual([]);
      expect(await workTimes(adminApi, facilityId, staffUserId, week4!)).toEqual([]);
      expect(times(await workTimes(adminApi, facilityId, staffUserId, week5!))).toEqual(times(staffWorkTimes, 28));
      const inWeek3 = await workTimes(adminApi, facilityId, staffUserId, week3!);
      expect(times(inWeek3.filter(({id}) => id !== keptId))).toEqual(times(staffWorkTimes, 14));
      expect(inWeek3.map(({id}) => id)).toContain(keptId);
    },
  );

  test(
    "a week is repeated until the end of the table; the weeks from a chosen one on are deleted",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, staffWorkTimes, weekDate} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const {main, row} = await openWeekly(page, STAFF.name);
      // The table goes a year ahead by default; a month after the seeded week is enough here.
      await main.locator('[data-role="to-month"]').fill(addDays(weekDate, 28).slice(0, 7));
      await expect(row(addDays(weekDate, 7 * 60)).locator).toHaveCount(0);
      await expect(row(weekDate).total).toHaveText("calendar.units.hours{count:20}");
      // The table ends with the last week of that month, wherever it falls.
      const rowCount = await allTableRows(main).count();
      let weeksAfter = 0;
      while (await row(addDays(weekDate, 7 * (weeksAfter + 1))).locator.count()) {
        weeksAfter++;
      }
      expect(weeksAfter).toBeGreaterThan(2);
      expect(weeksAfter).toBeLessThan(rowCount);
      const lastWeek = addDays(weekDate, 7 * weeksAfter);
      const workTimesOf = (week: string) => workTimes(adminApi, facilityId, staffUserId, week);

      await test.step("repeated until the end", async () => {
        await row(weekDate).action("paste_this_until_end");
        const dialog = weeklyDialog(page, "paste");
        await expect(dialog.heading).toBeVisible();
        await dialog.checkbox("skip_holidays").uncheck();
        await expect(page.getByText(`calendar.units.weeks{count:${weeksAfter}}`)).toBeVisible();
        await expect(dialog.text("target_weeks.paste_count", 4 * weeksAfter)).toBeVisible();
        await dialog.confirm.click();
        await expect(dialog.success).toBeVisible();
        await expect(dialog.heading).toHaveCount(0);
        await expect(row(lastWeek).total).toHaveText("calendar.units.hours{count:20}");
        expect(times(await workTimesOf(lastWeek))).toEqual(times(staffWorkTimes, 7 * weeksAfter));
        // Nothing past the end of the table.
        expect(await workTimesOf(addDays(lastWeek, 7))).toEqual([]);
      });

      await test.step("deleted from the third week on", async () => {
        const [week2, week3] = [addDays(weekDate, 7), addDays(weekDate, 14)];
        await row(week3).action("delete_week.from_this");
        const dialog = weeklyDialog(page, "delete");
        await expect(dialog.heading).toBeVisible();
        await dialog.checkbox("skip_holidays").uncheck();
        await expect(dialog.text("target_weeks.delete_count", 4 * (weeksAfter - 1))).toBeVisible();
        await dialog.confirm.click();
        await expect(dialog.heading).toHaveCount(0);
        await expect(row(week3).total).toHaveText("—");
        await expect(row(week2).total).toHaveText("calendar.units.hours{count:20}");
        await expect(row(lastWeek).total).toHaveText("—");
        expect(times(await workTimesOf(week2))).toEqual(times(staffWorkTimes, 7));
        expect(await workTimesOf(week3)).toEqual([]);
        expect(await workTimesOf(lastWeek)).toEqual([]);
        expect(times(await workTimesOf(weekDate))).toEqual(times(staffWorkTimes));
      });
    },
  );

  test("work times of a week are deleted, on the ticked weekdays only", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, staffUserId, staffWorkTimes, staffLeaveTime, facilityWorkTimes, weekDate} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const {row, weekdayCheckbox} = await openWeekly(page, STAFF.name);
    const seeded = row(weekDate);
    await expectDayEntries(seeded.day(TUE), [["9:00", "15:00"]]);
    await weekdayCheckbox(MON).uncheck();
    await expect(seeded.day(MON).locator(`[aria-description*="${WEEKLY}.day_notes.weekday_inactive"]`)).toBeVisible();

    await seeded.action("delete_week.this");
    const dialog = weeklyDialog(page, "delete");
    await expect(dialog.heading).toBeVisible();
    await expect(dialog.text("active_weekdays")).toBeVisible();
    // Monday's two entries are left out.
    await expectSectionShown(dialog.text("target_weeks.delete_count", 2), true);
    await dialog.checkbox("skip_holidays").uncheck();
    await expectSectionShown(dialog.text("target_weeks.delete_count", 2), true);
    await dialog.confirm.click();
    await expect(dialog.success).toBeVisible();

    await expectDayEntries(seeded.day(MON), [
      ["9:00", "15:00"],
      ["16:00", "18:00"],
    ]);
    await expect(seeded.day(TUE).getByRole("listitem")).toHaveCount(0);
    await expect(seeded.day(WED).getByRole("listitem")).toHaveCount(0);
    await expect(seeded.total).toHaveText("calendar.units.hours{count:8}");
    expect(times(await workTimes(adminApi, facilityId, staffUserId, weekDate))).toEqual(
      times(staffWorkTimes.slice(0, 2)),
    );
    // Neither the leave time of that week nor the facility-wide work times are touched.
    const left = await adminApi.get(
      `facility/${facilityId}/meeting/list?in=${[staffLeaveTime, ...facilityWorkTimes].map(({id}) => id).join(",")}`,
    );
    expect(await responseData<unknown[]>(left)).toHaveLength(1 + facilityWorkTimes.length);
  });

  readOnlyTest(
    "deleting with nothing to delete cannot be confirmed; cancelling changes nothing",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, staffWorkTimes, weekDate} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const {row} = await openWeekly(page, STAFF.name);
      await row(addDays(weekDate, 7)).action("delete_week.this");
      const dialog = weeklyDialog(page, "delete");
      await expectSectionShown(dialog.text("target_weeks.delete_count", 0), true);
      await expect(dialog.confirm).toBeDisabled();
      await page.getByRole("button", {name: "actions.cancel"}).click();
      await expect(dialog.heading).toHaveCount(0);

      await row(weekDate).action("delete_week.this");
      await expectSectionShown(dialog.text("target_weeks.delete_count", 4), true);
      await expect(dialog.confirm).toBeEnabled();
      await page.getByRole("button", {name: "actions.cancel"}).click();
      await expect(dialog.heading).toHaveCount(0);
      await expect(dialog.success).toHaveCount(0);
      await expect(row(weekDate).total).toHaveText("calendar.units.hours{count:20}");
      expect(await workTimes(adminApi, facilityId, staffUserId, weekDate)).toHaveLength(staffWorkTimes.length);
    },
  );

  test("copying a week skips the holidays of the target week unless told not to", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, staffUserId, weekDate} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    // The first holiday whose week, and the week before it, are after the seeded week.
    const holiday = firstAppHolidayFrom(addDays(weekDate, 14));
    const targetWeek = mondayOf(holiday);
    const sourceWeek = addDays(targetWeek, -7);
    const targetDays = [0, 1, 2, 3, 4, 5, 6].map((weekday) => addDays(targetWeek, weekday));
    const workingDay = targetDays.find((day) => !isAppHoliday(day))!;
    for (const date of [holiday, workingDay]) {
      await createWorkTime(adminApi, facilityId, staffUserId, {
        date: addDays(date, -7),
        startDayminute: 480,
        durationMinutes: 240,
      });
    }

    const {row} = await openWeekly(page, STAFF.name);
    const target = row(targetWeek);
    const holidayCell = target.day(targetDays.indexOf(holiday));
    await expect(holidayCell.locator(`[aria-description*="${WEEKLY}.day_notes.holiday"]`)).toBeVisible();
    await row(sourceWeek).action("select_week");
    await target.action("paste_here");
    const dialog = weeklyDialog(page, "paste");
    await expect(dialog.text("source_week.entries_count", 2)).toBeVisible();
    await expect(dialog.checkbox("skip_holidays")).toBeChecked();
    await expect(dialog.text("target_weeks.paste_count", 1)).toBeVisible();
    await dialog.checkbox("skip_holidays").uncheck();
    await expect(dialog.text("target_weeks.paste_count", 2)).toBeVisible();
    await dialog.checkbox("skip_holidays").check();
    await expect(dialog.text("target_weeks.paste_count", 1)).toBeVisible();
    await dialog.confirm.click();
    await expect(dialog.success).toBeVisible();

    await expect(holidayCell.getByRole("listitem")).toHaveCount(0);
    await expectDayEntries(target.day(targetDays.indexOf(workingDay)), [["8:00", "12:00"]]);
    expect(times(await workTimes(adminApi, facilityId, staffUserId, targetWeek))).toEqual([
      {date: workingDay, startDayminute: 480, durationMinutes: 240},
    ]);
  });

  readOnlyTest(
    "time tables calendar shows the week's work times and leave times, and their details",
    {tag: "@ui"},
    async ({page}) => {
      const {weekDate, staffUserId} = artifact();
      await login(page, ADMIN);
      const {main, summary, add} = await openTimeTablesCalendar(page, weekDate, staffUserId);
      await expect(main.getByRole("radio", {name: STAFF.name})).toBeChecked();
      // Monday, Tuesday and Wednesday.
      await expect(summary("work_time", "9:00–15:00")).toHaveCount(3);
      await expect(summary("work_time", "16:00–18:00")).toHaveCount(1);
      // The facility's work time is repeated in each day of the staff member's week.
      await expect(summary("facility_work_time", "8:00–16:00")).toHaveCount(5);
      await expect(add(FRI)).toBeVisible();
      await expect(main.locator("title=actions.add")).toHaveCount(5);
      await expect(main.getByText(STAFF_MONDAY_NOTES)).toBeVisible();
      await expect(main.getByText(STAFF_LEAVE_NOTES).first()).toBeVisible();
      await expect(main.getByText(FACILITY_LEAVE_NOTES).first()).toBeVisible();
      // The other staff member's times are not in this week view.
      await expect(summary("work_time", "10:00–14:00")).toHaveCount(0);
      await expect(main.getByText(STAFF_ADMIN_LEAVE_NOTES)).toHaveCount(0);

      await test.step("a work time", async () => {
        await summary("work_time", "16:00–18:00").click();
        await expect(
          page.getByRole("heading", {name: /^forms\.work_time_edit\.field_names\.entity_name$/i}),
        ).toBeVisible();
        await expect(page.getByRole("link", {name: STAFF.name}).first()).toBeVisible();
        await expect(page.locator('[data-field-box="dateAndTime"]')).toContainText(
          /16:00\s*–\s*18:00.*calendar\.units\.hours\{count:2\}/,
        );
        await page.getByRole("button", {name: "actions.close"}).click();
      });

      await test.step("the staff member's leave time", async () => {
        await main.getByText(STAFF_LEAVE_NOTES).first().click();
        await expect(
          page.getByRole("heading", {name: /^forms\.leave_time_edit\.field_names\.entity_name$/i}),
        ).toBeVisible();
        await expect(page.getByRole("textbox", {name: "forms.leave_time_edit.field_names.notes"})).toHaveValue(
          STAFF_LEAVE_NOTES,
        );
        await expect(page.getByText("calendar.all_day").first()).toBeVisible();
        await page.getByRole("button", {name: "actions.close"}).click();
      });

      await test.step("the facility-wide leave time", async () => {
        await main.getByText(FACILITY_LEAVE_NOTES).first().click();
        await expect(
          page.getByRole("heading", {name: /^forms\.facility_wide_leave_time_edit\.field_names\.entity_name$/i}),
        ).toBeVisible();
        await expect(page.getByRole("textbox", {name: /field_names\.notes$/})).toHaveValue(FACILITY_LEAVE_NOTES);
        await page.getByRole("button", {name: "actions.close"}).click();
      });

      await test.step("the other staff member", async () => {
        await main.getByRole("radio", {name: STAFF_ADMIN.name}).check();
        await expect(summary("work_time", "10:00–14:00")).toHaveCount(1);
        await expect(summary("work_time", "9:00–15:00")).toHaveCount(0);
        await expect(main.getByText(STAFF_ADMIN_LEAVE_NOTES).first()).toBeVisible();
        await expect(main.getByText(STAFF_LEAVE_NOTES)).toHaveCount(0);
        await expect(summary("facility_work_time", "8:00–16:00")).toHaveCount(5);
      });
    },
  );

  readOnlyTest("the month and day views of the time tables calendar", {tag: "@ui"}, async ({page}) => {
    const {weekDate, staffUserId, staffAdminUserId, facilityWorkTimes} = artifact();
    await login(page, ADMIN);

    await test.step("month view: the entries of the staff member and of the facility", async () => {
      const {main, summary} = await openTimeTablesCalendar(page, weekDate, staffUserId, "month");
      await expectCalendarMode(page, "month");
      await expect(main.getByRole("radio", {name: STAFF.name})).toBeChecked();
      await expect(summary("work_time", "9:00–15:00")).toHaveCount(3);
      await expect(summary("work_time", "16:00–18:00")).toHaveCount(1);
      await expect(summary("facility_work_time", "8:00–16:00")).toHaveCount(facilityWorkTimes.length);
      await expect(main.getByText(STAFF_LEAVE_NOTES).first()).toBeVisible();
      await expect(summary("work_time", "10:00–14:00")).toHaveCount(0);
      await summary("work_time", "16:00–18:00").click();
      await expect(
        page.getByRole("heading", {name: /^forms\.work_time_edit\.field_names\.entity_name$/i}),
      ).toBeVisible();
      await page.getByRole("button", {name: "actions.close"}).click();
    });

    await test.step("day view: a column per selected staff member", async () => {
      const thursday = addDays(weekDate, THU);
      const {main, summary} = await openTimeTablesCalendar(page, thursday, `${staffUserId},${staffAdminUserId}`, "day");
      await expectCalendarMode(page, "day");
      await expect(main.getByRole("checkbox", {name: STAFF.name, exact: true})).toBeChecked();
      await expect(main.getByRole("checkbox", {name: STAFF_ADMIN.name, exact: true})).toBeChecked();
      // The facility's work time is in the column of each of the two.
      await expect(summary("facility_work_time", "8:00–16:00")).toHaveCount(2);
      await expect(summary("work_time", "10:00–14:00")).toHaveCount(1);
      await expect(main.getByText(STAFF_LEAVE_NOTES).first()).toBeVisible();
      await main.getByRole("checkbox", {name: STAFF_ADMIN.name, exact: true}).uncheck();
      await expect(summary("work_time", "10:00–14:00")).toHaveCount(0);
      await expect(summary("facility_work_time", "8:00–16:00")).toHaveCount(1);
    });
  });

  test(
    "a click in the hours area of the time tables calendar starts a work time at that hour",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, weekDate} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      await login(page, ADMIN);
      const {main, summary} = await openTimeTablesCalendar(page, weekDate, staffUserId);
      await expect(summary("work_time", "16:00–18:00")).toHaveCount(1);
      // The hours area of a day column is the whole day high.
      const tuesday = main.locator(`[data-hours-of-day="${addDays(weekDate, TUE)}"]`);
      const {width, height} = (await tuesday.boundingBox())!;
      // A few pixels into the hour starting at 17:00, which has nothing on Tuesday.
      await tuesday.click({position: {x: width / 2, y: (height * 17) / 24 + 4}});

      await expect(page.getByRole("radio", {name: STAFF.name})).toBeChecked();
      await page.getByRole("button", {name: "forms.work_time_create.form_name"}).click();
      const form = page.locator("form").filter({has: submitButton(page, "work_time_create")});
      await expect(formField(form, "date")).toHaveValue(addDays(weekDate, TUE));
      await expect(formField(form, "time.startTime")).toHaveValue("17:00");
      await formField(form, "time.endTime").fill("19:00");
      await form.getByRole("button", {name: "forms.work_time_create.submit"}).click();
      await expectFormSuccess(page, "work_time_create");
      await expect(summary("work_time", "17:00–19:00")).toHaveCount(1);
      const onTuesday = (await workTimes(adminApi, facilityId, staffUserId, weekDate)).filter(
        ({date}) => date === addDays(weekDate, TUE),
      );
      expect(onTuesday.map(({startDayminute, durationMinutes}) => [startDayminute, durationMinutes])).toEqual([
        [540, 360],
        [1020, 120],
      ]);
    },
  );

  test("a work time is added from the time tables calendar", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, staffUserId, weekDate} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    await login(page, ADMIN);
    const {summary, add} = await openTimeTablesCalendar(page, weekDate, staffUserId);
    await add(FRI).click();
    // The choice between the staff member and the facility, then between the two types.
    await expect(page.getByRole("radio", {name: STAFF.name})).toBeChecked();
    await expect(page.getByRole("radio", {name: "meetings.facility_wide"})).not.toBeChecked();
    await page.getByRole("button", {name: "forms.work_time_create.form_name"}).click();
    await expect(page.getByRole("heading", {name: "forms.work_time_create.form_name"})).toBeVisible();
    const form = page.locator("form").filter({has: submitButton(page, "work_time_create")});
    await expect(formField(form, "date")).toHaveValue(addDays(weekDate, FRI));
    await formField(form, "time.startTime").fill("07:30");
    await formField(form, "time.endTime").fill("11:00");
    await form.getByRole("textbox", {name: "forms.work_time_create.field_names.notes"}).fill("early shift");
    await form.getByRole("button", {name: "forms.work_time_create.submit"}).click();
    await expectFormSuccess(page, "work_time_create");
    await expect(page.getByRole("heading", {name: "forms.work_time_create.form_name"})).toHaveCount(0);

    await expect(summary("work_time", "7:30–11:00")).toHaveCount(1);
    const created = (await workTimes(adminApi, facilityId, staffUserId, weekDate)).filter(
      ({date}) => date === addDays(weekDate, FRI),
    );
    expect(created).toEqual([
      expect.objectContaining({startDayminute: 450, durationMinutes: 210, notes: "early shift", isFacilityWide: false}),
    ]);
  });

  test("a facility-wide leave day is added from the time tables calendar", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, staffUserId, weekDate} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const {meetingType} = await adminApi.dictionaries();
    await login(page, ADMIN);
    const {main, add} = await openTimeTablesCalendar(page, weekDate, staffUserId);
    await add(WED).click();
    // The name of the second button follows the choice.
    await expect(page.getByRole("button", {name: "forms.leave_time_create.form_name"})).toBeVisible();
    await page.getByRole("radio", {name: "meetings.facility_wide"}).check();
    await page.getByRole("button", {name: "forms.facility_wide_leave_time_create.form_name"}).click();
    await expect(page.getByRole("heading", {name: "forms.facility_wide_leave_time_create.form_name"})).toBeVisible();
    const form = page.locator("form").filter({has: submitButton(page, "facility_wide_leave_time_create")});
    // In place of the staff member, above the form.
    await expect(page.getByText("meetings.facility_wide", {exact: true}).last()).toBeVisible();
    await expect(formField(form, "date")).toHaveValue(addDays(weekDate, WED));
    await form.getByRole("textbox", {name: /field_names\.notes$/}).fill("E2E repairs");
    await form.getByRole("button", {name: "forms.facility_wide_leave_time_create.submit"}).click();
    await expectFormSuccess(page, "facility_wide_leave_time_create");
    await expect(main.getByText("E2E repairs").first()).toBeVisible();

    expect(
      (
        await adminApi.tquery(`facility/${facilityId}/meeting/tquery`, {
          columns: ["date", "startDayminute", "durationMinutes", "typeDictId", "isFacilityWide"],
          filter: {type: "column", column: "notes", op: "%v%", val: "E2E repairs"},

          pageSize: 10,
        })
      ).rows,
    ).toEqual([
      {
        date: addDays(weekDate, WED),
        startDayminute: 0,
        durationMinutes: 1440,
        typeDictId: meetingType!.leave_time!,
        isFacilityWide: true,
      },
    ]);
  });

  test("a work time is changed and then deleted from its details", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, staffUserId, staffWorkTimes, weekDate} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const evening = staffWorkTimes[1]!;
    await login(page, ADMIN);
    const {summary} = await openTimeTablesCalendar(page, weekDate, staffUserId);
    await summary("work_time", "16:00–18:00").click();
    await page.getByRole("button", {name: "actions.edit"}).click();
    await expect(page.getByRole("heading", {name: "forms.work_time_edit.form_name"})).toBeVisible();
    const form = page.locator("form").filter({has: submitButton(page, "work_time_edit")});
    await expect(formField(form, "time.startTime")).toHaveValue("16:00");
    await formField(form, "time.endTime").fill("19:30");
    await form.getByRole("textbox", {name: "forms.work_time_edit.field_names.notes"}).fill("longer");
    await form.getByRole("button", {name: "forms.work_time_edit.submit"}).click();
    await expectFormSuccess(page, "work_time_edit");
    await expect(summary("work_time", "16:00–19:30")).toHaveCount(1);
    await expect(summary("work_time", "16:00–18:00")).toHaveCount(0);
    expect(
      (await workTimes(adminApi, facilityId, staffUserId, weekDate)).find(({id}) => id === evening.id),
    ).toMatchObject({
      date: evening.date,
      startDayminute: 960,
      durationMinutes: 210,
      notes: "longer",
    });

    await summary("work_time", "16:00–19:30").click();
    await page.getByRole("button", {name: "actions.delete"}).click();
    await expect(page.getByRole("heading", {name: "forms.work_time_delete.form_name"})).toBeVisible();
    await expect(page.getByText("forms.work_time_delete.confirmation_text")).toBeVisible();
    await submitButton(page, "work_time_delete").click();
    await expect(page.getByText(/forms\.work_time_delete\.success/)).toBeVisible();
    await expect(summary("work_time", "16:00–19:30")).toHaveCount(0);
    await expect(summary("work_time", "9:00–15:00")).toHaveCount(3);
    expect((await workTimes(adminApi, facilityId, staffUserId, weekDate)).map(({id}) => id)).toEqual(
      staffWorkTimes.filter(({id}) => id !== evening.id).map(({id}) => id),
    );
  });

  /** The dates and series links of the staff member's meetings of the type, from the week on. */
  async function staffSystemMeetings(api: MemoAPI, typeDictId: string, startDayminute: number) {
    const {facilityId, staffUserId, weekDate} = artifact();
    const {rows} = await api.tquery<{
      id: string;
      date: string;
      durationMinutes: number;
      fromMeetingId: string | null;
      interval: string | null;
    }>(`facility/${facilityId}/meeting/tquery`, {
      columns: ["id", "date", "durationMinutes", "fromMeetingId", "interval"],
      filter: {
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "typeDictId", op: "=", val: typeDictId},
          {type: "column", column: "staff.*.userId", op: "has", val: staffUserId},
          {type: "column", column: "startDayminute", op: "=", val: startDayminute},
          {type: "column", column: "date", op: ">=", val: weekDate},
        ],
      },
      sort: [{column: "date"}],
    });
    return rows;
  }

  test("a work time is added as a weekly series, without the unticked dates", {tag: "@ui"}, async ({page, api}) => {
    const {staffUserId, weekDate} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const {meetingType} = await adminApi.dictionaries();
    await login(page, ADMIN);
    const {summary, add} = await openTimeTablesCalendar(page, weekDate, staffUserId);
    await add(FRI).click();
    await page.getByRole("button", {name: "forms.work_time_create.form_name"}).click();
    const form = page.locator("form").filter({has: submitButton(page, "work_time_create")});
    await formField(form, "time.startTime").fill("07:30");
    await formField(form, "time.endTime").fill("11:00");
    // The dates to repeat on show with the checkbox only.
    const dateCheckboxes = form.locator('input[name^="seriesIncludeDate."]');
    await expect(dateCheckboxes).toHaveCount(0);
    await formField(form, "createSeries").check();
    const friday = addDays(weekDate, FRI);
    await form.getByText("meetings.interval_labels.7d").click();
    await expect(form.locator(`input[name="seriesIncludeDate.${addDays(friday, 7)}"]`)).toBeChecked();
    await form.locator(`input[name="seriesIncludeDate.${addDays(friday, 14)}"]`).uncheck();
    const dates = await checkedSeriesDates(form);
    expect(dates).toContain(addDays(friday, 7));
    expect(dates).not.toContain(addDays(friday, 14));
    expect(dates.length).toBeGreaterThan(2);

    await form.getByRole("button", {name: "forms.work_time_create.submit"}).click();
    await expectFormSuccess(page, "work_time_series_create");
    await expect(summary("work_time", "7:30–11:00")).toHaveCount(1);
    const series = await staffSystemMeetings(adminApi, meetingType!.work_time!, 450);
    expect(series.map(({date}) => date)).toEqual([friday, ...dates]);
    expect(new Set(series.map(({durationMinutes}) => durationMinutes))).toEqual(new Set([210]));
    // All of them are one series, started by the first.
    expect(new Set(series.map(({fromMeetingId}) => fromMeetingId))).toEqual(new Set([series[0]!.id]));
    expect(new Set(series.map(({interval}) => interval))).toEqual(new Set(["7d"]));
  });

  test(
    "a leave time is made a series from its details, and the series is then extended",
    {tag: "@ui"},
    async ({page, api}) => {
      const {staffUserId, weekDate} = artifact();
      const adminApi = await api.loggedInAs(ADMIN);
      const {meetingType} = await adminApi.dictionaries();
      const leaveTimes = () => staffSystemMeetings(adminApi, meetingType!.leave_time!, 0);
      const [leaveTime, ...others] = await leaveTimes();
      expect(others).toEqual([]);
      expect(leaveTime).toMatchObject({date: addDays(weekDate, THU), fromMeetingId: null});
      await login(page, ADMIN);
      const {main} = await openTimeTablesCalendar(page, weekDate, staffUserId);
      await main.getByText(STAFF_LEAVE_NOTES).first().click();
      await page.getByRole("button", {name: "meetings.create_series"}).click();
      await expect(page.getByRole("heading", {name: "forms.work_time_series_create.form_name"})).toBeVisible();
      const form = page.locator("form").filter({has: page.locator('input[name^="seriesIncludeDate."]')});
      const thursday = leaveTime!.date;
      await expect(form.locator('input[name^="seriesIncludeDate."]:checked').first()).toBeVisible();
      const dates = await checkedSeriesDates(form);
      // Repeated day by day unless told otherwise: some of the dates are next to each other.
      expect(dates.some((date) => dates.includes(addDays(date, 1)))).toBe(true);
      expect(dates.every((date) => date > thursday)).toBe(true);
      await form.locator('button[type="submit"]').click();
      await expect(form).toHaveCount(0);
      const series = await leaveTimes();
      expect(series.map(({date}) => date)).toEqual([thursday, ...dates]);
      expect(new Set(series.map(({fromMeetingId}) => fromMeetingId))).toEqual(new Set([leaveTime!.id]));

      // The button of a meeting in a series extends the series.
      await main.getByText(STAFF_LEAVE_NOTES).first().click();
      await expect(page.getByRole("button", {name: "meetings.extend_series"})).toBeVisible();
      await expect(page.getByRole("button", {name: "meetings.create_series"})).toHaveCount(0);
    },
  );

  readOnlyTest(
    "absences page lists the leave times of all the staff and of the facility",
    {tag: "@ui"},
    async ({page}) => {
      const {staffLeaveTime, staffUserId, staffAdminUserId} = artifact();
      await openPage(page, `/${FACILITY.url}/absences?date=${staffLeaveTime.date}`, STAFF);
      const main = page.locator("main");
      // The page has the month view only.
      await expect(main.getByRole("button", {name: /^calendar\.this_month$/i})).toBeVisible();
      await expect(main.getByText("calendar.units.week")).toHaveCount(0);
      await expect(main.locator('input[id^="resourceSelected_"]')).toHaveCount(0);

      const staffLeave = main.getByText(STAFF_LEAVE_NOTES);
      const staffAdminLeave = main.getByText(new RegExp(`12:00–14:00\\s+${STAFF_ADMIN_LEAVE_NOTES}`));
      await expect(staffLeave).toBeVisible();
      await expect(staffAdminLeave).toBeVisible();
      await expect(main.getByText(FACILITY_LEAVE_NOTES)).toBeVisible();
      // Each staff member's leave time is signed with the staff member.
      await expect(main.locator(`a[href$="/staff/${staffUserId}"]`)).toHaveText(STAFF.name);
      await expect(main.locator(`a[href$="/staff/${staffAdminUserId}"]`)).toHaveText(STAFF_ADMIN.name);
      // Work times are not shown here.
      await expect(main.getByText(/9:00–15:00/)).toHaveCount(0);
      await expect(main.getByText(/10:00–14:00/)).toHaveCount(0);

      // It is a view only: nothing is opened or created from here.
      await expect(main.locator("title=actions.add")).toHaveCount(0);
      await staffLeave.click();
      // Nothing to wait for: the time a modal would take to open.
      await page.waitForTimeout(500);
      await expect(page.getByRole("heading", {name: /leave_time/})).toHaveCount(0);
      await expect(page.getByRole("button", {name: "actions.edit"})).toHaveCount(0);
    },
  );

  readOnlyTest(
    "staff member's calendar shows the work times and leave times, read-only",
    {tag: "@ui"},
    async ({page}) => {
      const {weekDate, staffUserId, staffAdminUserId} = artifact();
      await login(page, STAFF);
      await page.goto(
        `/${FACILITY.url}/calendar?${new URLSearchParams({mode: "week", date: weekDate, resources: staffUserId})}`,
      );
      await disableTranslations(page);
      const main = page.locator("main");
      const workTime = (hours: string) => entrySummary(main, "work_time", hours);
      await expect(main.getByRole("radio", {name: STAFF.name})).toBeChecked();
      await expect(workTime("9:00–15:00")).toHaveCount(3);
      await expect(workTime("16:00–18:00")).toHaveCount(1);
      // The facility's work times only shade the hours here, with no summary.
      await expect(workTime("8:00–16:00")).toHaveCount(0);
      await expect(main.getByText(STAFF_LEAVE_NOTES).first()).toBeVisible();
      await expect(main.getByText(FACILITY_LEAVE_NOTES).first()).toBeVisible();
      await expect(main.getByText(STAFF_ADMIN_LEAVE_NOTES)).toHaveCount(0);

      // Time tables are not edited from the calendar of meetings: a click on one is a click on the
      // day, which starts a new meeting.
      for (const entry of [workTime("16:00–18:00"), main.getByText(STAFF_LEAVE_NOTES).first()]) {
        await entry.click();
        await expect(page.getByRole("heading", {name: "forms.meeting_create.form_name"})).toBeVisible();
        await expect(page.getByRole("heading", {name: /(work|leave)_time/})).toHaveCount(0);
        await page.getByRole("button", {name: "actions.close"}).click();
        await expect(page.getByRole("heading", {name: "forms.meeting_create.form_name"})).toHaveCount(0);
      }

      await page.goto(
        `/${FACILITY.url}/calendar?${new URLSearchParams({mode: "week", date: weekDate, resources: staffAdminUserId})}`,
      );
      await disableTranslations(page);
      await expect(main.getByRole("radio", {name: STAFF_ADMIN.name})).toBeChecked();
      await expect(workTime("10:00–14:00")).toHaveCount(1);
      await expect(workTime("9:00–15:00")).toHaveCount(0);
      await expect(main.getByText(STAFF_ADMIN_LEAVE_NOTES).first()).toBeVisible();
    },
  );

  readOnlyTest("the system meetings list has the work times and the leave times", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/system-meetings`, STAFF);
    const main = page.locator("main");
    // Five facility-wide work times, four of STAFF, one of STAFF_ADMIN; three leave times.
    await expect(main.getByText("tables.tables.meeting.summary{count:13}")).toBeVisible();
    const rows = allTableRows(main);
    await expect(rows).toHaveCount(13);
    await expect(rows.filter({hasText: "dictionary.meetingType.work_time"})).toHaveCount(10);
    await expect(rows.filter({hasText: "dictionary.meetingType.leave_time"})).toHaveCount(3);
    await expect(rows.filter({hasText: STAFF.name})).toHaveCount(5);
    await expect(rows.filter({hasText: STAFF_ADMIN.name})).toHaveCount(2);
  });
});
