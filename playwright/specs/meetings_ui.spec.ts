import {cloneMeeting, createMeetingResource} from "../helpers/queries.ts";
import {
  checkedSeriesDates,
  editHeading,
  openMeeting,
  saveEdit,
  seededDays,
  startEditing,
  viewHeading,
} from "../helpers/meetings.ts";
import type {Locator} from "@playwright/test";
import {meetingBlocks, resourceInput} from "../helpers/calendar.ts";
import {FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {createdId, responseData} from "../lib/responses.ts";
import {
  allTableRows,
  chooseInFormSelect,
  expectFormErrors,
  expectFormSuccess,
  expectSectionShown,
  formField,
  formSelect,
  submitButton,
  tableCell,
} from "../helpers/selectors.ts";
import {expect, login, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * The meeting view and edit modal, opened from the meeting's block in the calendar. Creating
 * meetings is covered in `calendar_ui.spec.ts`.
 */

interface Attendant {
  readonly userId: string;
  readonly attendanceStatusDictId: string;
}

interface Meeting {
  readonly id: string;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
  readonly statusDictId: string;
  readonly isRemote: boolean;
  readonly fromMeetingId: string | null;
  readonly interval: string | null;
  readonly staff: readonly Attendant[];
  readonly clients: readonly Attendant[];
}

async function getMeetings(api: MemoAPI, facilityId: string, ids: readonly string[]) {
  const res = await api.get(`facility/${facilityId}/meeting/list?in=${ids.join(",")}`);
  const data = await responseData<readonly Meeting[]>(res);
  return data.toSorted((a, b) => a.date.localeCompare(b.date));
}

async function getMeeting(api: MemoAPI, facilityId: string, id: string) {
  const meetings = await getMeetings(api, facilityId, [id]);
  expect(meetings).toHaveLength(1);
  return meetings[0]!;
}

/** The ids of the meetings of the series started from the given meeting, ordered by date. */
async function seriesMeetings(api: MemoAPI, facilityId: string, fromMeetingId: string) {
  const ids = (
    await api.tquery<{id: string}>(`facility/${facilityId}/meeting/tquery`, {
      columns: ["id"],
      filter: {type: "column", column: "fromMeetingId", op: "=", val: fromMeetingId},
      sort: [{column: "date"}],
    })
  ).rows.map(({id}) => id);
  return ids.length ? getMeetings(api, facilityId, ids) : [];
}

/** The meeting's data without the fields that every update changes. */
function withoutUpdateStamp(meeting: Meeting) {
  const {
    updatedAt: _updatedAt,
    updatedBy: _updatedBy,
    ...rest
  } = meeting as Meeting & {
    readonly updatedAt?: string;
    readonly updatedBy?: string;
  };
  return rest;
}

/** The row of the attendant in the meeting form: the user select, the status, the buttons. */
function attendantRow(form: Locator, type: "staff" | "clients", index: number) {
  const field = (name: string) => form.page().locator(`[name="${type}.${index}.${name}"]`);
  // The innermost element holding both fields of the attendant.
  return form
    .locator("div")
    .filter({has: field("userId")})
    .filter({has: field("attendanceStatusDictId")})
    .last();
}

meetingsLayer.describe((artifact) => {
  const seededDay = seededDays(artifact);

  test(
    "'Mark as completed' canned action sets the meeting status without entering edit mode",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, pastMeeting, todayMeeting, futureMeeting, groupMeeting, shortMeeting} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      const ids = [pastMeeting, todayMeeting, futureMeeting, groupMeeting, shortMeeting].map(({id}) => id);
      const before = await getMeetings(staffApi, facilityId, ids);
      const completed = (await staffApi.dictionaries()).meetingStatus!.completed!;
      expect(before.find(({id}) => id === futureMeeting.id)!.statusDictId).not.toBe(completed);
      await login(page, STAFF);
      await openMeeting(page, futureMeeting);

      // Submits immediately, with only the status changed.
      await page.getByRole("button", {name: "meetings.mark_as_completed"}).click();
      await expectFormSuccess(page, "meeting_edit");

      expect((await getMeetings(staffApi, facilityId, ids)).map(withoutUpdateStamp)).toEqual(
        before.map((meeting) =>
          withoutUpdateStamp(meeting.id === futureMeeting.id ? {...meeting, statusDictId: completed} : meeting),
        ),
      );
    },
  );

  test(
    "switching the modal to edit mode and toggling isRemote persists the change",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, pastMeeting, todayMeeting, futureMeeting, groupMeeting, shortMeeting} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      const ids = [pastMeeting, todayMeeting, futureMeeting, groupMeeting, shortMeeting].map(({id}) => id);
      const before = await getMeetings(staffApi, facilityId, ids);
      expect(before.map(({isRemote}) => isRemote)).toEqual([false, false, false, false, false]);
      await login(page, STAFF);
      await openMeeting(page, futureMeeting);
      await startEditing(page);

      const isRemote = formField(page, "isRemote");
      await expect(isRemote).not.toBeChecked();
      await isRemote.click();
      await expect(isRemote).toBeChecked();
      await saveEdit(page);

      expect((await getMeetings(staffApi, facilityId, ids)).map(withoutUpdateStamp)).toEqual(
        before.map((meeting) =>
          withoutUpdateStamp(meeting.id === futureMeeting.id ? {...meeting, isRemote: true} : meeting),
        ),
      );
    },
  );

  test("attendants are removed and added in the edit form", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, staffUserId, groupMeeting, adultClientInfos, childClientInfos} = artifact();
    // The group meeting has two staff members, and the clients Diana, Zoe and Will.
    const [diana, eve] = [adultClientInfos[3]!, adultClientInfos[4]!];
    const [zoe, will] = [childClientInfos[0]!, childClientInfos[1]!];
    await login(page, STAFF);
    const form = await openMeeting(page, groupMeeting);
    await expect(form.getByRole("link", {name: STAFF_ADMIN.name})).toBeVisible();
    await expect(form.getByRole("link", {name: zoe.name})).toBeVisible();
    await startEditing(page);
    await expect(formSelect(form, "clients.1.userId")).toContainText(zoe.name);

    await attendantRow(form, "clients", 1).locator("title=actions.delete").click();
    await expect(formSelect(form, "clients.1.userId")).toContainText(will.name);
    // With more than one attendant there is always an empty row at the end for the next one.
    await expect(formSelect(form, "clients.2.userId")).toHaveText("");
    await chooseInFormSelect(page, "clients.2.userId", new RegExp(eve.name));
    await expect(formSelect(form, "clients.2.userId")).toContainText(eve.name);
    await expect(formSelect(form, "clients.3.userId")).toHaveText("");
    await expect(formSelect(form, "staff.1.userId")).toContainText(STAFF_ADMIN.name);
    await attendantRow(form, "staff", 1).locator("title=actions.delete").click();
    await expect(formSelect(form, "staff.1.userId")).toHaveText("");
    await expect(form.locator('[name="staff.2.userId"]')).toHaveCount(0);
    await saveEdit(page);

    const staffApi = await api.loggedInAs(STAFF);
    const saved = await getMeeting(staffApi, facilityId, groupMeeting.id);
    expect(saved.staff.map((a) => a.userId)).toEqual([staffUserId]);
    expect(saved.clients.map((a) => a.userId)).toEqual([diana.id, will.id, eve.id]);
    const block = meetingBlocks(page, groupMeeting.id);
    await expect(block).toContainText(eve.name);
    await expect(block).not.toContainText(zoe.name);
  });

  test("attendance statuses are set per attendant in the edit form", {tag: "@ui"}, async ({page, api, browserName}) => {
    test.fixme(
      browserName === "firefox",
      "In Firefox the long labels of the testing language squeeze the status column to a letter per line, " +
        "and the options end up outside the viewport.",
    );
    const {facilityId, pastMeeting} = artifact();
    await login(page, STAFF);
    const form = await openMeeting(page, pastMeeting);
    await startEditing(page);
    await chooseInFormSelect(page, "clients.0.attendanceStatusDictId", /^dictionary\.attendanceStatus\.no_show/);
    await chooseInFormSelect(page, "staff.0.attendanceStatusDictId", /^dictionary\.attendanceStatus\.late_present/);
    await saveEdit(page);

    const staffApi = await api.loggedInAs(STAFF);
    const {attendanceStatus, meetingStatus} = await staffApi.dictionaries();
    expect(await getMeeting(staffApi, facilityId, pastMeeting.id)).toMatchObject({
      statusDictId: meetingStatus!.completed!,
      staff: [{attendanceStatusDictId: attendanceStatus!.late_present!}],
      clients: [{attendanceStatusDictId: attendanceStatus!.no_show!}],
    });
    // The view mode shows the new statuses.
    await meetingBlocks(page, pastMeeting.id).click();
    await expect(viewHeading(page)).toBeVisible();
    await expect(formSelect(form, "clients.0.attendanceStatusDictId")).toContainText(
      "dictionary.attendanceStatus.no_show",
    );
    await expect(formSelect(form, "staff.0.attendanceStatusDictId")).toContainText(
      "dictionary.attendanceStatus.late_present",
    );
  });

  test(
    "'Mark as cancelled' by the client: at once with one client, through the form with more",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, todayMeeting, groupMeeting} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      const {attendanceStatus, meetingStatus} = await staffApi.dictionaries();
      const cancelled = attendanceStatus!.cancelled!;
      const ok = attendanceStatus!.ok!;
      await login(page, STAFF);

      await test.step("a meeting with one client is cancelled right away", async () => {
        await openMeeting(page, todayMeeting);
        await page.getByRole("button", {name: "meetings.mark_as_cancelled.text"}).click();
        await page.getByRole("button", {name: "meetings.mark_as_cancelled.by_client", exact: true}).click();
        await expectFormSuccess(page, "meeting_edit");
        expect(await getMeeting(staffApi, facilityId, todayMeeting.id)).toMatchObject({
          statusDictId: meetingStatus!.cancelled!,
          staff: [{attendanceStatusDictId: ok}],
          clients: [{attendanceStatusDictId: cancelled}],
        });
      });

      await test.step("with more clients the form opens for adjusting who cancelled", async () => {
        const form = await openMeeting(page, groupMeeting);
        await page.getByRole("button", {name: "meetings.mark_as_cancelled.text"}).click();
        await page.getByRole("button", {name: "meetings.mark_as_cancelled.by_clientellipsis", exact: true}).click();
        await expect(editHeading(page)).toBeVisible();
        await expect(formSelect(form, "statusDictId")).toContainText("dictionary.meetingStatus.cancelled");
        for (const index of [0, 1, 2]) {
          await expect(formSelect(form, `clients.${index}.attendanceStatusDictId`)).toContainText(
            "dictionary.attendanceStatus.cancelled",
          );
        }
        // Nothing is saved yet.
        expect((await getMeeting(staffApi, facilityId, groupMeeting.id)).statusDictId).toBe(meetingStatus!.planned!);
        // The second client did not cancel after all.
        await chooseInFormSelect(page, "clients.1.attendanceStatusDictId", /^dictionary\.attendanceStatus\.ok/);
        await saveEdit(page);
        const saved = await getMeeting(staffApi, facilityId, groupMeeting.id);
        expect(saved.statusDictId).toBe(meetingStatus!.cancelled!);
        expect(saved.clients.map((a) => a.attendanceStatusDictId)).toEqual([cancelled, ok, cancelled]);
        expect(saved.staff.map((a) => a.attendanceStatusDictId)).toEqual([ok, ok]);
      });
    },
  );

  test("the date and time are changed in the edit form; the calendar follows", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    await login(page, STAFF);
    const form = await openMeeting(page, todayMeeting);
    await startEditing(page);
    const startTime = formField(form, "time.startTime");
    await expect(startTime).toHaveValue("10:00");
    await startTime.fill("14:30");
    // The end time follows, keeping the duration.
    await expect(formField(form, "time.endTime")).toHaveValue("15:30");
    await formField(form, "date").fill(seededDay(1));
    await saveEdit(page);

    const staffApi = await api.loggedInAs(STAFF);
    expect(await getMeeting(staffApi, facilityId, todayMeeting.id)).toMatchObject({
      date: seededDay(1),
      startDayminute: 14 * 60 + 30,
      durationMinutes: 60,
    });
    // The meeting left the day shown; the toast's button leads to its new place.
    const block = meetingBlocks(page, todayMeeting.id);
    await expect(block).toHaveCount(0);
    await page.getByRole("button", {name: "actions.show"}).click();
    await expect(block).toBeVisible();
  });

  readOnlyTest(
    "cancelling the edit form goes back to the view mode and saves nothing",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, todayMeeting, adultClientInfos} = artifact();
      await login(page, STAFF);
      const form = await openMeeting(page, todayMeeting);
      await startEditing(page);
      const isRemote = formField(form, "isRemote");
      await isRemote.check();
      await chooseInFormSelect(page, "clients.0.userId", new RegExp(adultClientInfos[4]!.name));
      await form.getByRole("button", {name: "actions.cancel"}).click();
      await expect(viewHeading(page)).toBeVisible();
      await expect(editHeading(page)).toHaveCount(0);
      await expect(isRemote).not.toBeChecked();
      await expect(form.getByRole("link", {name: adultClientInfos[1]!.name})).toBeVisible();
      await expect(page.getByText("forms.meeting_edit.success")).toHaveCount(0);
      const staffApi = await api.loggedInAs(STAFF);
      expect(await getMeeting(staffApi, facilityId, todayMeeting.id)).toMatchObject({
        isRemote: false,
        clients: [{userId: adultClientInfos[1]!.id}],
      });
    },
  );

  test("a meeting is deleted from its modal after a confirmation", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, futureMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await login(page, STAFF);
    await openMeeting(page, futureMeeting);
    const deleteButton = page.getByRole("button", {name: "actions.delete"});
    const confirmHeading = page.getByRole("heading", {name: "forms.meeting_delete.form_name"});

    await deleteButton.click();
    await expect(confirmHeading).toBeVisible();
    await expect(page.getByText("forms.meeting_delete.confirmation_text")).toBeVisible();
    // A meeting outside a series has no series options.
    await expect(formField(page, "delete_option")).toHaveCount(0);
    await page.getByRole("button", {name: "actions.cancel"}).click();
    await expect(confirmHeading).toHaveCount(0);
    await expect(viewHeading(page)).toBeVisible();
    expect(await getMeetings(staffApi, facilityId, [futureMeeting.id])).toHaveLength(1);

    await deleteButton.click();
    await submitButton(page, "meeting_delete").click();
    await expect(page.getByText(/forms\.meeting_delete\.success/)).toBeVisible();
    await expect(viewHeading(page)).toHaveCount(0);
    await expect(meetingBlocks(page, futureMeeting.id)).toHaveCount(0);
    expect(await getMeetings(staffApi, facilityId, [futureMeeting.id])).toEqual([]);
  });

  test("deleting a meeting of a series offers the series options", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const cloneIds = await cloneMeeting(staffApi, facilityId, todayMeeting.id, [
      seededDay(7),
      seededDay(14),
      seededDay(21),
    ]);
    const second = {id: cloneIds[0]!, date: seededDay(7)};
    await login(page, STAFF);
    const form = await openMeeting(page, second);
    // The second meeting of four.
    await expect(form.locator("title=Models.meeting.seriesNumber")).toHaveText("2");
    await expect(form.locator("title=Models.meeting.seriesCount")).toHaveText("4");
    await expect(page.getByRole("button", {name: "meetings.extend_series"})).toBeVisible();

    await page.getByRole("button", {name: "actions.delete"}).click();
    await expect(page.getByRole("heading", {name: "forms.meeting_delete.form_name"})).toBeVisible();
    const option = (value: string) => page.locator(`input[name="delete_option"][value="${value}"]`);
    const submit = (count: number) =>
      page.getByRole("button", {name: `forms.meeting_delete.submit_series{count:${count}}`});
    await expect(option("one")).toBeChecked();
    await expect(submit(1)).toBeVisible();
    await option("all").check();
    await expect(submit(4)).toBeVisible();
    await option("from_this").check();
    await expect(submit(3)).toBeVisible();
    await option("from_next").check();
    await submit(2).click();
    await expect(page.getByText("forms.meeting_delete.success{count:2}")).toBeVisible();

    const remaining = await getMeetings(staffApi, facilityId, [todayMeeting.id, ...cloneIds]);
    expect(remaining.map((m) => m.id)).toEqual([todayMeeting.id, second.id]);
    // The meeting itself stays, so the modal stays too, now showing the shorter series.
    await expect(form.locator("title=Models.meeting.seriesCount")).toHaveText("2");
  });

  test("the series dialog clones a meeting to the ticked dates", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await login(page, STAFF);
    await openMeeting(page, todayMeeting);
    await page.getByRole("button", {name: "meetings.create_series"}).click();
    await expect(page.getByRole("heading", {name: "forms.meeting_series_create.form_name"})).toBeVisible();
    const form = page.locator("#meeting_series_create");
    // Weekly by default; the interval changes the dates, not their number.
    await expect(form.locator('input[name^="seriesIncludeDate."]')).toHaveCount(9);
    await expect(form.locator(`input[name="seriesIncludeDate.${seededDay(7)}"]`)).toHaveCount(1);
    await form.getByText("meetings.interval_labels.14d").click();
    await expect(form.locator(`input[name="seriesIncludeDate.${seededDay(7)}"]`)).toHaveCount(0);
    await expect(form.locator('input[name^="seriesIncludeDate."]')).toHaveCount(9);
    await form.locator(`input[name="seriesIncludeDate.${seededDay(28)}"]`).uncheck();
    const dates = await checkedSeriesDates(form);
    expect(dates).toContain(seededDay(14));
    expect(dates).not.toContain(seededDay(28));
    await expect(form).toContainText(`number_of_meetings.total{count:${dates.length + 1}}`);

    await form.getByRole("button", {name: "forms.meeting_series_create.submit"}).click();
    await expectFormSuccess(page, "meeting_series_create");
    await expect(form).toHaveCount(0);
    const series = await seriesMeetings(staffApi, facilityId, todayMeeting.id);
    expect(series.map((m) => m.date)).toEqual([todayMeeting.date, ...dates]);
    const original = series[0]!;
    expect(original.id).toBe(todayMeeting.id);
    for (const meeting of series) {
      expect(meeting).toMatchObject({
        interval: "14d",
        startDayminute: original.startDayminute,
        durationMinutes: original.durationMinutes,
        staff: original.staff,
        clients: original.clients,
      });
    }

    // The meeting is now the first of the series, which can be extended.
    await meetingBlocks(page, todayMeeting.id).click();
    await expect(viewHeading(page)).toBeVisible();
    const editForm = page.locator("#meeting_edit");
    await expect(editForm.locator("title=Models.meeting.seriesNumber")).toHaveText("1");
    await expect(editForm.locator("title=Models.meeting.seriesCount")).toHaveText(`${series.length}`);
    await expect(page.getByRole("button", {name: "meetings.extend_series"})).toBeVisible();
    await expect(page.getByRole("button", {name: "meetings.create_series"})).toHaveCount(0);
  });

  test(
    "'Create a copy in a week' opens the create form filled in from the meeting",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, todayMeeting, adultClientInfos} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      await login(page, STAFF);
      await openMeeting(page, todayMeeting);
      // The unnamed second half of the split button, next to "create series", opens the menu.
      await page
        .getByRole("button", {name: "meetings.create_series"})
        .locator("xpath=following-sibling::button")
        .click();
      await page.getByRole("button", {name: /meetings\.create_copy\.in_one_week/}).click();
      await expect(page.getByRole("heading", {name: "forms.meeting_create.form_name"})).toBeVisible();
      const form = page.locator("#meeting_create");
      await expect(formField(form, "date")).toHaveValue(seededDay(7));
      await expect(formField(form, "time.startTime")).toHaveValue("10:00");
      await expect(formField(form, "time.endTime")).toHaveValue("11:00");
      await expect(formSelect(form, "typeDictId")).toContainText("dictionary.meetingType.other");
      await expect(formSelect(form, "staff.0.userId")).toContainText(STAFF.name);
      await expect(formSelect(form, "clients.0.userId")).toContainText(adultClientInfos[1]!.name);
      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_create");

      // The copy and the original make a series, with no interval.
      const series = await seriesMeetings(staffApi, facilityId, todayMeeting.id);
      expect(series.map((m) => m.date)).toEqual([seededDay(0), seededDay(7)]);
      expect(series[0]!.id).toBe(todayMeeting.id);
      expect(series[1]).toMatchObject({
        startDayminute: 600,
        durationMinutes: 60,
        interval: null,
        staff: [{userId: staffUserId}],
        clients: [{userId: adultClientInfos[1]!.id}],
      });
    },
  );

  test("the edit form flags a busy staff member and a taken resource", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, staffAdminUserId, futureMeeting, customTypeIds} = artifact();
    const adminApi = await api.loggedInAs(STAFF_ADMIN);
    const dicts = await adminApi.dictionaries();
    const takenRoomId = await createMeetingResource(adminApi, facilityId, "E2E Taken Room");
    await createMeetingResource(adminApi, facilityId, "E2E Free Room");
    // Half an hour into the future meeting (10:00–11:00): the other staff member, in the room.
    const otherMeetingId = await createdId(
      await adminApi.createMeeting(facilityId, {
        typeDictId: customTypeIds.therapy,
        date: futureMeeting.date,
        startDayminute: 630,
        durationMinutes: 60,
        statusDictId: dicts.meetingStatus!.planned!,
        staff: [{userId: staffAdminUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
        resources: [{resourceDictId: takenRoomId}],
      }),
    );

    await login(page, STAFF);
    const form = await openMeeting(page, futureMeeting);
    await startEditing(page);
    const busy = '[aria-description*="meetings.conflicts.with_other_meetings"]';
    const showConflicts = form.getByRole("link", {name: "meetings.resource_conflicts.show_conflicts"});

    await test.step("a staff member with another meeting at the time", async () => {
      await expect(form.locator('[aria-description*="meetings.conflicts."]')).toHaveCount(1);
      await expect(form.locator(busy)).toHaveCount(0);
      await form.locator("title=forms.meeting.add_attendant.staff").click();
      await chooseInFormSelect(page, "staff.1.userId", new RegExp(STAFF_ADMIN.name));
      await expect(attendantRow(form, "staff", 1).locator(busy)).toBeVisible();
      await expect(attendantRow(form, "staff", 0).locator(busy)).toHaveCount(0);
    });

    await test.step("a resource used by another meeting at the time", async () => {
      // The link to the conflicts sits in a collapsed section (clipped, not removed) until one of
      // the chosen resources is taken; it names the conflicting resources.
      const conflictingResources = (ids: string) => new RegExp(`[?&]resources=${ids}&`);
      await expect(showConflicts).toHaveAttribute("href", conflictingResources(""));
      await expectSectionShown(showConflicts, false);
      await formSelect(form, "resources").click();
      const conflictMark = "title=meetings.resource_conflicts.conflicting_resource";
      await expect(page.getByRole("option", {name: "E2E Taken Room"}).locator(conflictMark)).toBeVisible();
      await expect(page.getByRole("option", {name: "E2E Free Room"}).locator(conflictMark)).toHaveCount(0);
      await page.getByRole("option", {name: "E2E Free Room"}).click();
      await expect(formSelect(form, "resources")).toContainText("E2E Free Room");
      await expect(showConflicts).toHaveAttribute("href", conflictingResources(""));
      await chooseInFormSelect(page, "resources", "E2E Taken Room");
      await expect(showConflicts).toHaveAttribute("href", conflictingResources(takenRoomId));
      await expectSectionShown(showConflicts, true);
    });

    await saveEdit(page);
    const rows = (
      await adminApi.tquery<Record<string, unknown>>(`facility/${facilityId}/meeting/tquery`, {
        columns: ["id", "resourceConflicts.exists", "resourceConflicts.*.meetingId", "resources.count", "staff.count"],
        filter: {type: "column", column: "id", op: "in", val: [futureMeeting.id, otherMeetingId]},

        pageSize: 10,
      })
    ).rows;
    expect(rows.find((row) => row.id === futureMeeting.id)).toMatchObject({
      "resourceConflicts.exists": true,
      "resourceConflicts.*.meetingId": [otherMeetingId],
      "resources.count": 2,
      "staff.count": 2,
    });
    expect(rows.find((row) => row.id === otherMeetingId)).toMatchObject({
      "resourceConflicts.exists": true,
      "resourceConflicts.*.meetingId": [futureMeeting.id],
    });

    await test.step("the view mode links to the conflict in the calendar", async () => {
      await meetingBlocks(page, futureMeeting.id).first().click();
      await expect(viewHeading(page)).toBeVisible();
      await showConflicts.click();
      await expect(viewHeading(page)).toHaveCount(0);
      // The room's column is added: both meetings are in it.
      await expect(resourceInput(page, "day", "E2E Taken Room")).toBeChecked();
      await expect(resourceInput(page, "day", "E2E Free Room")).not.toBeChecked();
      await expect(meetingBlocks(page, otherMeetingId)).toHaveCount(1);
      await expect(meetingBlocks(page, futureMeeting.id)).toHaveCount(2);
    });
  });

  test(
    "a meeting left without staff is saved as facility-wide after a confirmation",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, todayMeeting} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      const isFacilityWide = async () => {
        return (
          await staffApi.tquery<{isFacilityWide: boolean}>(`facility/${facilityId}/meeting/tquery`, {
            columns: ["isFacilityWide"],
            filter: {type: "column", column: "id", op: "=", val: todayMeeting.id},
            sort: [],
            pageSize: 1,
          })
        ).rows[0]!.isFacilityWide;
      };
      expect(await isFacilityWide()).toBe(false);
      await login(page, STAFF);
      const form = await openMeeting(page, todayMeeting);
      await startEditing(page);
      await attendantRow(form, "staff", 0).locator("title=actions.delete").click();
      await expect(formSelect(form, "staff.0.userId")).toHaveText("");
      const submit = form.getByRole("button", {name: "forms.meeting_edit.submit"});
      const confirmHeading = page.getByRole("heading", {name: "meetings.facility_wide_meeting.title"});

      await submit.click();
      await expect(confirmHeading).toBeVisible();
      await expect(page.getByText("meetings.facility_wide_meeting.body")).toBeVisible();
      await page.getByRole("button", {name: "actions.cancel"}).last().click();
      await expect(confirmHeading).toHaveCount(0);
      await expect(editHeading(page)).toBeVisible();
      expect((await getMeeting(staffApi, facilityId, todayMeeting.id)).staff).toHaveLength(1);

      await submit.click();
      // The confirmation of the edit form has the label of the create form's button.
      await submitButton(page, "meeting_create").click();
      await expectFormSuccess(page, "meeting_edit");
      expect((await getMeeting(staffApi, facilityId, todayMeeting.id)).staff).toEqual([]);
      expect(await isFacilityWide()).toBe(true);
      // A facility-wide meeting is in the calendar of every staff member.
      const block = meetingBlocks(page, todayMeeting.id);
      await expect(block).toHaveCount(1);
      await resourceInput(page, "day", STAFF_ADMIN.name).check();
      await expect(block).toHaveCount(2);
    },
  );

  test("the series page lists the meetings of a series in order", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await cloneMeeting(staffApi, facilityId, todayMeeting.id, [seededDay(14), seededDay(28)], "14d");
    await login(page, STAFF);
    const form = await openMeeting(page, todayMeeting);
    // The link to the series opens in a new tab.
    const seriesHref = `/${FACILITY.url}/meeting-series/${todayMeeting.id}`;
    await expect(form.locator(`a[href="${seriesHref}"][target="_blank"]`)).toBeVisible();
    await openPage(page, seriesHref);
    const rows = allTableRows(page.locator("main"));
    await expect(rows).toHaveCount(3);
    await expect(page.locator("main").getByText("tables.tables.meeting.summary{count:3}")).toBeVisible();
    // The first column is the number in the series; the seeded meetings outside it are not listed.
    for (const index of [0, 1, 2]) {
      await expect(tableCell(rows.nth(index), "seriesNumber")).toHaveText(`${index + 1}`);
      await expect(rows.nth(index)).toContainText(artifact().adultClientInfos[1]!.name);
    }
  });

  readOnlyTest(
    "the meeting modal closes on Escape, the close button and a click outside; in edit mode not on the click",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, futureMeeting} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      const [before] = await getMeetings(staffApi, facilityId, [futureMeeting.id]);
      await login(page, STAFF);
      await openMeeting(page, futureMeeting);
      const block = meetingBlocks(page, futureMeeting.id);
      // The backdrop covers the page; its corner is clear of the modal.
      const clickOutside = () => page.mouse.click(3, 3);

      await page.keyboard.press("Escape");
      await expect(viewHeading(page)).toBeHidden();
      await block.click();
      await expect(viewHeading(page)).toBeVisible();
      await page.getByRole("button", {name: "actions.close"}).click();
      await expect(viewHeading(page)).toBeHidden();
      await block.click();
      await expect(viewHeading(page)).toBeVisible();
      await clickOutside();
      await expect(viewHeading(page)).toBeHidden();

      await block.click();
      await startEditing(page);
      const isRemote = formField(page, "isRemote");
      await isRemote.check();
      await clickOutside();
      await expect(isRemote).toBeChecked();
      await expect(editHeading(page)).toBeVisible();
      // Escape drops the edit, the change with it.
      await page.keyboard.press("Escape");
      await expect(editHeading(page)).toBeHidden();
      await expect(viewHeading(page)).toBeHidden();
      await expect(block).toBeVisible();
      expect(await getMeetings(staffApi, facilityId, [futureMeeting.id])).toEqual([before]);
    },
  );

  readOnlyTest("the meeting form shows the errors of the date and the time", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const before = await getMeeting(staffApi, facilityId, todayMeeting.id);
    await login(page, STAFF);
    const form = await openMeeting(page, todayMeeting);
    await startEditing(page);
    const submit = submitButton(page, "meeting_edit");
    const date = formField(form, "date");
    const startTime = formField(form, "time.startTime");
    const endTime = formField(form, "time.endTime");

    await test.step("no date", async () => {
      await date.fill("");
      await submit.click();
      await expectFormErrors(form, {date: "required"});
      await expect(date).toHaveAttribute("aria-invalid", "true");
    });

    await test.step("no start time: neither the start nor the length is known", async () => {
      await date.fill(todayMeeting.date);
      await startTime.fill("");
      await submit.click();
      await expectFormErrors(form, {startDayminute: "required", durationMinutes: "required"});
    });

    await test.step("no end time", async () => {
      await startTime.fill("12:00");
      await endTime.fill("");
      await submit.click();
      await expectFormErrors(form, {durationMinutes: "required"});
    });

    await test.step("shorter than five minutes", async () => {
      await endTime.fill("12:03");
      await submit.click();
      await expectFormErrors(form, {durationMinutes: "min.numeric"});
    });

    await form.getByRole("button", {name: "actions.cancel"}).click();
    await expect(page.getByText("forms.meeting_edit.success")).toHaveCount(0);
    expect(await getMeeting(staffApi, facilityId, todayMeeting.id)).toEqual(before);
  });
});
