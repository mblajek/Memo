import {clickSlotBelowMeeting, meetingBlocks, openCalendar} from "../helpers/calendar.ts";
import {shownDateWithWeekday} from "../helpers/dates.ts";
import {
  editHeading,
  expectMeetingsListCounts,
  meetingsListTab,
  openMeeting,
  saveEdit,
  shownTableRows,
  startEditing,
  viewHeading,
} from "../helpers/meetings.ts";
import {clientAttributes, meetingsMatching} from "../helpers/queries.ts";
import {exportTable, exportedRecords, stubSaveFilePicker} from "../helpers/saved_file.ts";
import {
  addToList,
  allTableRows,
  attributeValue,
  chooseInFormSelect,
  expectFormSuccess,
  formField,
  formSelect,
  removeFirstFromList,
  submitButton,
  tableRows,
  tableRowsWithLink,
} from "../helpers/selectors.ts";
import {openTimeTablesCalendar} from "../helpers/time_tables.ts";
import {loadConfig} from "../lib/config.ts";
import {addDays, holidayFreeWeekStart} from "../lib/dates.ts";
import {ADMIN, FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {HAPPY_ATTRS, HAPPY_RESOURCES, happyPathLayer} from "../lib/layers/happy_path.ts";
import {dropSession, expect, logInThroughForm, MemoAPI, openPage, test} from "../lib/test.ts";

/**
 * One long test of an ordinary day of a facility, as a first check that nothing big is broken:
 * each step does a thing the staff do every day and looks for its result where they would. The
 * variants and the edge cases of each of these things are in the specs of their own.
 */

const CLIENT = "Happy Path Client";
const THERAPY = "Integration Test Therapy";
const [THU, FRI] = [3, 4] as const;

interface Meeting {
  readonly id: string;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
  readonly statusDictId: string;
  readonly notes: string | null;
  readonly fromMeetingId: string | null;
  readonly staff: readonly {readonly userId: string; readonly attendanceStatusDictId: string}[];
  readonly clients: readonly {readonly userId: string; readonly attendanceStatusDictId: string}[];
  readonly resources: readonly {readonly resourceDictId: string}[];
}

happyPathLayer.describe((artifact) => {
  /** The meetings with the given notes, by date. */
  const meetingsWithNotes = (api: MemoAPI, notes: string) =>
    meetingsMatching<Meeting>(api, artifact().facilityId, {
      type: "column",
      column: "notes",
      op: "/v/",
      val: `^${notes}$`,
    });

  test("a day of a facility", {tag: ["@ui", "@happy"]}, async ({page, api, browserName}) => {
    test.setTimeout(10 * 60_000);
    const {facilityId, staffUserId, staffAdminUserId, todayMeeting, groupMeeting, adultClientInfos, resourceIds} =
      artifact();
    const [diana, eve] = [adultClientInfos[3]!, adultClientInfos[4]!];
    const today = todayMeeting.date;
    const staffApi = await api.loggedInAs(STAFF);
    const {attendanceStatus, meetingStatus} = await staffApi.dictionaries();
    const main = page.locator("main");
    let clientId = "";

    const openDay = (date: string) => openCalendar(page, FACILITY.url, {mode: "day", date, resources: [STAFF.name]});

    /**
     * Opens the day of the meeting anew (which also takes the toasts off the calendar), clicks the
     * free slot a quarter after the meeting, and waits for the create form.
     */
    async function openCreateFormBelow(meeting: Pick<Meeting, "id" | "date">, durationMinutes = 60) {
      await openDay(meeting.date);
      await clickSlotBelowMeeting(page, meetingBlocks(page, meeting.id), {durationMinutes, minutesAfterEnd: 15});
      await expect(page.getByRole("heading", {name: "forms.meeting_create.form_name"})).toBeVisible();
      return page.locator("#meeting_create");
    }

    /** Creates a therapy meeting of the client in the slot a quarter after the block. */
    async function createMeetingBelow(meeting: Pick<Meeting, "id" | "date">, notes: string) {
      const form = await openCreateFormBelow(meeting);
      await chooseInFormSelect(page, "typeDictId", new RegExp(THERAPY));
      await chooseInFormSelect(page, "clients.0.userId", new RegExp(CLIENT));
      await form.getByRole("textbox", {name: "forms.meeting_create.field_names.notes"}).fill(notes);
      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_create");
      await expect(form).toHaveCount(0);
      const created = await meetingsWithNotes(staffApi, notes);
      expect(created).toHaveLength(1);
      await expect(meetingBlocks(page, created[0]!.id)).toBeVisible();
      return created[0]!;
    }

    await test.step("the global admin sees the admin pages", async () => {
      await logInThroughForm(page, (await loadConfig()).ui.admin);
      await openPage(page, "/admin/users");
      await expect(tableRows(main, STAFF.email)).toHaveCount(1);
      await openPage(page, "/admin/facilities");
      await expect(tableRows(main, FACILITY.name)).toHaveCount(1);
    });

    await test.step("a staff member logs in and has the calendar, with the meeting of today", async () => {
      await dropSession(page);
      await logInThroughForm(page, STAFF);
      // The start page of a staff member is the calendar of the facility.
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/calendar`));
      await openDay(today);
      await expect(meetingBlocks(page, todayMeeting.id)).toBeVisible();
    });

    await test.step("a client is created, with attribute values", async () => {
      await openPage(page, `/${FACILITY.url}/clients/create`);
      const form = page.locator("#client_create");
      await formField(form, "name").fill(CLIENT);
      await chooseInFormSelect(page, "client.typeDictId", /clientType\.adult/);
      await formField(form, "client.contactPhone").fill("+48 600 200 300");
      await formField(form, `client.${HAPPY_ATTRS.nickname}`).fill("Hap");
      await formField(form, `client.${HAPPY_ATTRS.referredOn}`).fill("2024-02-29");
      await formField(form, `client.${HAPPY_ATTRS.consent}`).check();
      await formField(form, `client.${HAPPY_ATTRS.sessions}`).fill("12");
      await form.locator(`textarea[name="client.${HAPPY_ATTRS.background}"]`).fill("Referred by a friend.\nShy.");
      await addToList(form, HAPPY_ATTRS.languages, "polski");
      await addToList(form, HAPPY_ATTRS.languages, "English");
      await addToList(form, HAPPY_ATTRS.checkups, "2024-03-01");
      await addToList(form, HAPPY_ATTRS.checkups, "2024-09-02");
      await submitButton(page, "client_create").click();
      await expectFormSuccess(page, "client_create");
      // The details of the new client open.
      await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
      clientId = page.url().split("/").at(-1)!;
      const details = page.locator("form#client_edit");
      await expect(formField(details, "name")).toHaveValue(CLIENT);
      await expect(attributeValue(details, HAPPY_ATTRS.nickname)).toHaveText("Hap");
      await expect(attributeValue(details, HAPPY_ATTRS.referredOn)).toHaveText(shownDateWithWeekday("2024-02-29"));
      await expect(attributeValue(details, HAPPY_ATTRS.consent)).toHaveText("bool_values.yes");
      await expect(attributeValue(details, HAPPY_ATTRS.sessions)).toHaveText("12");
      await expect(attributeValue(details, HAPPY_ATTRS.background)).toHaveText(/^Referred by a friend\.\s+Shy\.$/);
      await expect(attributeValue(details, HAPPY_ATTRS.languages)).toHaveText("polski, English");
      // The dates of a list are shown one under another.
      await expect(attributeValue(details, HAPPY_ATTRS.checkups)).toHaveText(
        [shownDateWithWeekday("2024-03-01"), shownDateWithWeekday("2024-09-02")].join(""),
      );
    });

    await test.step("the client is found in the clients table, and edited from the details", async () => {
      await openPage(page, `/${FACILITY.url}/clients`);
      await expect(allTableRows(main)).toHaveCount(11);
      await main.getByRole("textbox", {name: "actions.search"}).fill("happy path");
      await expect(allTableRows(main)).toHaveCount(1);
      await tableRows(main, CLIENT).getByRole("link", {name: CLIENT}).click();
      await expect(page).toHaveURL(new RegExp(`/clients/${clientId}$`));
      const details = page.locator("form#client_edit");
      await details.getByRole("button", {name: "actions.edit"}).click();
      await formField(details, "client.addressCity").fill("Kraków");
      await formField(details, `client.${HAPPY_ATTRS.nickname}`).fill("Happy");
      await removeFirstFromList(details, HAPPY_ATTRS.languages);
      await addToList(details, HAPPY_ATTRS.languages, "Deutsch");
      await addToList(details, HAPPY_ATTRS.checkups, "2025-03-03");
      await submitButton(page, "client_edit").click();
      await expectFormSuccess(page, "client_edit");
      await expect(attributeValue(details, HAPPY_ATTRS.nickname)).toHaveText("Happy");
      await expect(attributeValue(details, HAPPY_ATTRS.languages)).toHaveText("English, Deutsch");
      expect(await clientAttributes(staffApi, facilityId, clientId)).toMatchObject({
        contactPhone: "+48 600 200 300",
        addressCity: "Kraków",
        [HAPPY_ATTRS.nickname]: "Happy",
        [HAPPY_ATTRS.referredOn]: "2024-02-29",
        [HAPPY_ATTRS.consent]: true,
        [HAPPY_ATTRS.sessions]: 12,
        [HAPPY_ATTRS.background]: "Referred by a friend.\nShy.",
        [HAPPY_ATTRS.languages]: ["English", "Deutsch"],
        [HAPPY_ATTRS.checkups]: ["2024-03-01", "2024-09-02", "2025-03-03"],
      });
    });

    await test.step("a group is made for the client, and another client is added to it", async () => {
      await page.getByRole("button", {name: "actions.client_group.add", exact: true}).click();
      await chooseInFormSelect(page, "clients.1.userId", new RegExp(eve.name));
      await formField(page, "notes").fill("Happy group");
      await submitButton(page, "client_group_create").click();
      await expectFormSuccess(page, "client_group_create");
      await expect(main.getByRole("link", {name: eve.name})).toBeVisible();

      await openPage(page, `/${FACILITY.url}/clients/${diana.id}`);
      await page.getByRole("button", {name: "actions.client_group.add_to"}).click();
      await chooseInFormSelect(page, "group_member", CLIENT);
      await page.getByRole("button", {name: "forms.add_to_client_group.submit.add_to_group"}).click();
      const form = page.locator("form#client_group_edit");
      await expect(formField(form, "notes")).toHaveValue("Happy group");
      await submitButton(page, "client_group_edit").click();
      await expectFormSuccess(page, "client_group_edit");
      await expect(main.getByRole("link", {name: CLIENT})).toBeVisible();
      const groups = await staffApi.list<{clients: readonly {userId: string}[]}>(
        `facility/${facilityId}/client-group`,
        (await clientAttributes(staffApi, facilityId, clientId)).groupIds as string[],
      );
      expect(groups.map(({clients}) => clients.map(({userId}) => userId).toSorted())).toEqual([
        [clientId, eve.id, diana.id].toSorted(),
      ]);
    });

    let first: Meeting, second: Meeting, third: Meeting, weekly: Meeting;

    await test.step("a meeting is created from a slot of the calendar; the meetings list has it", async () => {
      const form = await openCreateFormBelow(todayMeeting);
      await expect(formField(form, "date")).toHaveValue(today);
      await expect(formField(form, "time.startTime")).toHaveValue("11:15");
      await expect(formSelect(form, "staff.0.userId")).toContainText(STAFF.name);
      await chooseInFormSelect(page, "typeDictId", new RegExp(THERAPY));
      await expect(formField(form, "time.endTime")).toHaveValue("12:15");
      await chooseInFormSelect(page, "clients.0.userId", new RegExp(CLIENT));
      await chooseInFormSelect(page, "resources", HAPPY_RESOURCES.room);
      await form.getByRole("textbox", {name: "forms.meeting_create.field_names.notes"}).fill("Happy first");
      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_create");
      first = (await meetingsWithNotes(staffApi, "Happy first"))[0]!;
      expect(first).toMatchObject({
        date: today,
        startDayminute: 675,
        durationMinutes: 60,
        staff: [{userId: staffUserId}],
        clients: [{userId: clientId}],
        resources: [{resourceDictId: resourceIds.room}],
      });
      const block = meetingBlocks(page, first.id);
      await expect(block).toContainText(CLIENT);

      await openPage(page, `/${FACILITY.url}/meetings`);
      const row = tableRows(main, "Happy first");
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(THERAPY);
      await expect(row).toContainText(CLIENT);
      await expect(row).toContainText(HAPPY_RESOURCES.room);
    });

    await test.step("the meeting is edited: moved, with more people, another resource and notes", async () => {
      const form = await openMeeting(page, first);
      await expect(form.getByRole("link", {name: CLIENT})).toBeVisible();
      await startEditing(page);
      // The time is a text until asked for its fields.
      await form.locator('[data-field-box="dateAndTime"]').getByRole("button", {name: "actions.edit"}).click();
      await formField(form, "time.startTime").fill("15:30");
      await expect(formField(form, "time.endTime")).toHaveValue("16:30");
      await form.locator("title=forms.meeting.add_attendant.clients").click();
      await chooseInFormSelect(page, "clients.1.userId", new RegExp(diana.name));
      await form.locator("title=forms.meeting.add_attendant.staff").click();
      await chooseInFormSelect(page, "staff.1.userId", new RegExp(STAFF_ADMIN.name));
      await chooseInFormSelect(page, "resources", HAPPY_RESOURCES.projector);
      await form.getByRole("textbox", {name: /field_names\.notes$/}).fill("Happy first, moved");
      await saveEdit(page);
      first = (await meetingsWithNotes(staffApi, "Happy first, moved"))[0]!;
      expect(first).toMatchObject({
        startDayminute: 930,
        durationMinutes: 60,
        staff: [{userId: staffUserId}, {userId: staffAdminUserId}],
        clients: [{userId: clientId}, {userId: diana.id}],
      });
      expect(first.resources.map(({resourceDictId}) => resourceDictId).toSorted()).toEqual(
        [resourceIds.room, resourceIds.projector].toSorted(),
      );
      await expect(meetingBlocks(page, first.id)).toContainText(diana.name);
    });

    await test.step("two more meetings, and a weekly series with one of its meetings deleted", async () => {
      second = await createMeetingBelow(todayMeeting, "Happy second");
      third = await createMeetingBelow(second, "Happy third");

      // The series starts tomorrow, after the group meeting of an hour and a half.
      const form = await openCreateFormBelow(groupMeeting, 90);
      await expect(formField(form, "time.startTime")).toHaveValue("13:45");
      await chooseInFormSelect(page, "typeDictId", new RegExp(THERAPY));
      await chooseInFormSelect(page, "clients.0.userId", new RegExp(CLIENT));
      await form.getByRole("textbox", {name: "forms.meeting_create.field_names.notes"}).fill("Happy weekly");
      await formField(form, "createSeries").check();
      await form.getByText("meetings.interval_labels.7d").click();
      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_series_create");
      const series = await meetingsWithNotes(staffApi, "Happy weekly");
      expect(series.length).toBeGreaterThanOrEqual(5);
      weekly = series[0]!;
      expect(series.every(({fromMeetingId}) => fromMeetingId === weekly.id)).toBe(true);

      await openMeeting(page, series[1]!);
      await page.getByRole("button", {name: "actions.delete"}).click();
      await expect(page.locator('input[name="delete_option"][value="one"]')).toBeChecked();
      await page.getByRole("button", {name: "forms.meeting_delete.submit_series{count:1}"}).click();
      await expect(page.getByText(/forms\.meeting_delete\.success/)).toBeVisible();
      expect((await meetingsWithNotes(staffApi, "Happy weekly")).map(({id}) => id)).toEqual(
        series.filter((_meeting, index) => index !== 1).map(({id}) => id),
      );
    });

    await test.step("the meetings are resolved: completed and cancelled with the buttons, and in the form", async () => {
      await openMeeting(page, second);
      await page.getByRole("button", {name: "meetings.mark_as_completed"}).click();
      await expectFormSuccess(page, "meeting_edit");

      await openMeeting(page, third);
      await page.getByRole("button", {name: "meetings.mark_as_cancelled.text"}).click();
      await page.getByRole("button", {name: "meetings.mark_as_cancelled.by_client", exact: true}).click();
      await expectFormSuccess(page, "meeting_edit");

      await openMeeting(page, first);
      await startEditing(page);
      await chooseInFormSelect(page, "statusDictId", /meetingStatus\.completed/);
      await chooseInFormSelect(page, "clients.1.attendanceStatusDictId", /^dictionary\.attendanceStatus\.no_show/);
      await saveEdit(page);

      const statusOf = async (notes: string) => {
        const [meeting] = await meetingsWithNotes(staffApi, notes);
        return [meeting!.statusDictId, ...meeting!.clients.map((client) => client.attendanceStatusDictId)];
      };
      expect(await statusOf("Happy second")).toEqual([meetingStatus!.completed, attendanceStatus!.ok]);
      expect(await statusOf("Happy third")).toEqual([meetingStatus!.cancelled, attendanceStatus!.cancelled]);
      expect(await statusOf("Happy first, moved")).toEqual([
        meetingStatus!.completed,
        attendanceStatus!.ok,
        attendanceStatus!.no_show,
      ]);
    });

    await test.step("the details of the client list the meetings, by their state", async () => {
      await openPage(page, `/${FACILITY.url}/clients/${clientId}`);
      const series = await meetingsWithNotes(staffApi, "Happy weekly");
      await expectMeetingsListCounts(page, {planned: series.length, completed: 2});
      await meetingsListTab(page, "completed").click();
      await expect(shownTableRows(page)).toHaveCount(2);
      await expect(shownTableRows(page).filter({hasText: "Happy first, moved"})).toHaveCount(1);
      await expect(shownTableRows(page).filter({hasText: "Happy second"})).toHaveCount(1);
      // The cancelled one is on neither list, only among all the meetings.
      await expect(shownTableRows(page).filter({hasText: "Happy third"})).toHaveCount(0);
      await meetingsListTab(page, "all").click();
      await main.getByRole("textbox", {name: "actions.search"}).last().fill("Happy third");
      await expect(shownTableRows(page)).toHaveCount(1);
      await expect(shownTableRows(page)).toContainText("dictionary.meetingStatus.cancelled");
    });

    const leaveWeek = holidayFreeWeekStart(1);

    await test.step("an admin enters a leave and a work time of the staff member", async () => {
      await dropSession(page);
      await logInThroughForm(page, ADMIN);
      const {add, summary} = await openTimeTablesCalendar(page, leaveWeek, staffUserId);
      await add(FRI).click();
      await page.getByRole("button", {name: "forms.leave_time_create.form_name"}).click();
      const leaveForm = page.locator("form").filter({has: submitButton(page, "leave_time_create")});
      await expect(formField(leaveForm, "time.allDay")).toBeChecked();
      await leaveForm.getByRole("textbox", {name: /field_names\.notes$/}).fill("Happy vacation");
      await submitButton(page, "leave_time_create").click();
      await expectFormSuccess(page, "leave_time_create");
      await expect(main.getByText("Happy vacation").first()).toBeVisible();

      await add(THU).click();
      await page.getByRole("button", {name: "forms.work_time_create.form_name"}).click();
      const workForm = page.locator("form").filter({has: submitButton(page, "work_time_create")});
      await expect(formField(workForm, "date")).toHaveValue(addDays(leaveWeek, THU));
      await formField(workForm, "time.startTime").fill("07:30");
      await formField(workForm, "time.endTime").fill("11:00");
      await workForm.getByRole("button", {name: "forms.work_time_create.submit"}).click();
      await expectFormSuccess(page, "work_time_create");
      await expect(summary("work_time", "7:30–11:00")).toHaveCount(1);
    });

    await test.step("the admin has the staff, with the meetings of a staff member, and the admins", async () => {
      await openPage(page, `/${FACILITY.url}/staff`);
      await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(1);
      await tableRows(main, STAFF.name).getByRole("link", {name: STAFF.name}).click();
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/staff/${staffUserId}$`));
      await expect(main.getByRole("heading", {name: STAFF.name})).toBeVisible();
      await meetingsListTab(page, "completed").click();
      await expect(shownTableRows(page).filter({hasText: "Happy second"})).toHaveCount(1);

      await openPage(page, `/${FACILITY.url}/admins`);
      await expect(tableRows(main, ADMIN.name)).toHaveCount(1);
      await expect(tableRows(main, STAFF_ADMIN.name)).toHaveCount(1);
    });

    await test.step("the attendants report has the attendants of a meeting, and exports them", async () => {
      await dropSession(page);
      await logInThroughForm(page, STAFF);
      // Firefox has no API for the export, and the app does not offer it there.
      const exports = browserName !== "firefox";
      if (exports) {
        await stubSaveFilePicker(page);
      }
      await openPage(page, `/${FACILITY.url}/meeting-attendants`);
      await main.getByRole("textbox", {name: "actions.search"}).fill("Happy first");
      // The moved meeting: two staff members and two clients.
      await expect(allTableRows(main)).toHaveCount(4);
      const attendants = [CLIENT, diana.name, STAFF.name, STAFF_ADMIN.name];
      for (const name of attendants) {
        await expect(tableRowsWithLink(main, "attendant.userId", name), name).toHaveCount(1);
      }
      if (exports) {
        const csv = await exportTable(page, main);
        const attendantColumn = "Tables.tables.meeting_multi_attendant.column_names.attendant.userId";
        expect(exportedRecords(csv).map((record) => record[attendantColumn])).toEqual(
          expect.arrayContaining(attendants),
        );
        expect(exportedRecords(csv)).toHaveLength(4);
      }
    });

    await test.step("the calendar of the day and of the week has it all", async () => {
      await openDay(today);
      for (const meeting of [first, second, third]) {
        await expect(meetingBlocks(page, meeting.id)).toBeVisible();
      }
      await meetingBlocks(page, third.id).click();
      await expect(viewHeading(page)).toBeVisible();
      await expect(formSelect(page.locator("#meeting_edit"), "statusDictId")).toContainText(
        "dictionary.meetingStatus.cancelled",
      );
      await page.keyboard.press("Escape");
      await expect(viewHeading(page)).toHaveCount(0);
      await expect(editHeading(page)).toHaveCount(0);

      await openCalendar(page, FACILITY.url, {mode: "week", date: today, resources: []});
      for (const meeting of [first, second, third]) {
        await expect(meetingBlocks(page, meeting.id).first()).toBeVisible();
      }

      await openDay(weekly.date);
      await expect(meetingBlocks(page, weekly.id)).toContainText(CLIENT);

      // The week of the leave has it.
      await openCalendar(page, FACILITY.url, {mode: "week", date: leaveWeek, resources: []});
      await expect(main.getByText("Happy vacation").first()).toBeVisible();
    });
  });
});
