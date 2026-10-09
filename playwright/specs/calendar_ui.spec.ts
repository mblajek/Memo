import {createMeetingResource} from "../helpers/queries.ts";
import {checkedSeriesDates, seededDays, viewHeading} from "../helpers/meetings.ts";
import {DateTime} from "luxon";
import {BROWSER_LOCALE, shownTableDate} from "../helpers/dates.ts";
import {
  calendarPageButtons,
  clickSlotBelowMeeting,
  expectCalendarMode,
  meetingBlocks,
  openCalendar,
  resourceInput,
  switchCalendarMode,
} from "../helpers/calendar.ts";
import {FACILITY, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {disableTranslations} from "../helpers/lang.ts";
import {responseData} from "../lib/responses.ts";
import {
  chooseInFormSelect,
  expectFormErrors,
  expectFormSuccess,
  formField,
  formSelect,
  tableCellTexts,
  tableRows,
} from "../helpers/selectors.ts";
import {expect, login, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * UI tests of the facility calendar: its views, navigation, the staff and resources selection,
 * and creating meetings by clicking a time slot.
 */

interface Meeting {
  readonly id: string;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
  readonly typeDictId: string;
  readonly statusDictId: string;
  readonly isRemote: boolean;
  readonly notes: string | null;
  readonly fromMeetingId: string | null;
  readonly interval: string | null;
  readonly staff: readonly {readonly userId: string}[];
  readonly clients: readonly {readonly userId: string}[];
  readonly resources: readonly {readonly resourceDictId: string}[];
}

/** The facility's meetings starting at the given time of day, from the given date on, by date. */
async function meetingsStartingAt(api: MemoAPI, facilityId: string, startDayminute: number, fromDate: string) {
  const ids = (
    await api.tquery<{id: string}>(`facility/${facilityId}/meeting/tquery`, {
      columns: ["id"],
      filter: {
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "startDayminute", op: "=", val: startDayminute},
          {type: "column", column: "date", op: ">=", val: fromDate},
        ],
      },
      sort: [{column: "date"}],
    })
  ).rows.map(({id}) => id);
  if (!ids.length) {
    return [];
  }
  const listRes = await api.get(`facility/${facilityId}/meeting/list?in=${ids.join(",")}`);
  const data = await responseData<readonly Meeting[]>(listRes);
  return data.toSorted((a, b) => a.date.localeCompare(b.date));
}

// The seeded meeting of today is 10:00–11:00; the slot clicked in the create tests is 11:15.
const TODAY_MEETING_MINUTES = 60;
const ROOM = "E2E Room";
const PROJECTOR = "E2E Projector";
const NOTES = "First line\nSecond line";
const SLOT = {minutesAfterEnd: 15, startDayminute: 675, time: "11:15"} as const;

meetingsLayer.describe((artifact) => {
  const seededDay = seededDays(artifact);

  readOnlyTest(
    "week view shows the staff member's meetings and pages through the weeks",
    {tag: "@ui"},
    async ({page}) => {
      const {pastMeeting, todayMeeting, futureMeeting} = artifact();
      await login(page, STAFF);
      await openCalendar(page, FACILITY.url, {mode: "week", date: seededDay(0), resources: [STAFF.name]});
      const main = page.locator("main");
      const todayButton = main.getByRole("button", {name: /^calendar\.today$/i});
      const {prev, next} = calendarPageButtons(page);
      const today = meetingBlocks(page, todayMeeting.id);
      const past = meetingBlocks(page, pastMeeting.id);
      const future = meetingBlocks(page, futureMeeting.id);

      await expect(today).toBeVisible();
      await expect(today).toContainText(artifact().adultClientInfos[1]!.name);
      await expect(past).toHaveCount(0);
      await expect(future).toHaveCount(0);
      await expect(todayButton).toBeDisabled();

      await next.click();
      await expect(future).toBeVisible();
      await expect(today).toHaveCount(0);
      await expect(todayButton).toBeEnabled();

      await prev.click();
      await expect(today).toBeVisible();
      await prev.click();
      await expect(past).toBeVisible();
      await expect(today).toHaveCount(0);

      await todayButton.click();
      await expect(today).toBeVisible();
      await expect(past).toHaveCount(0);
      await expect(todayButton).toBeDisabled();
    },
  );

  readOnlyTest("day, week and month views; the chosen view survives a reload", {tag: "@ui"}, async ({page}) => {
    const {pastMeeting, todayMeeting, futureMeeting} = artifact();
    await login(page, STAFF);
    await openCalendar(page, FACILITY.url, {mode: "day", date: seededDay(0), resources: [STAFF.name]});
    const main = page.locator("main");
    const today = meetingBlocks(page, todayMeeting.id);
    const weekApart = meetingBlocks(page, pastMeeting.id).or(meetingBlocks(page, futureMeeting.id));

    await test.step("day view: one column per selected resource", async () => {
      await expect(today).toBeVisible();
      await expect(weekApart).toHaveCount(0);
      await expect(main.getByRole("button", {name: STAFF.name, exact: true})).toBeVisible();
      // In the day view any number of resources can be selected.
      await expect(main.getByRole("checkbox", {name: STAFF.name})).toBeChecked();
      await expect(main.getByRole("radio", {name: STAFF.name})).toHaveCount(0);
    });

    await test.step("week view: one resource at a time", async () => {
      await switchCalendarMode(page, "week");
      await expect(today).toBeVisible();
      await expect(main.getByRole("radio", {name: STAFF.name})).toBeChecked();
      await expect(main.getByRole("checkbox", {name: STAFF.name})).toHaveCount(0);
    });

    await test.step("month view", async () => {
      await switchCalendarMode(page, "month");
      await expect(today).toBeVisible();
      // The month grid has whole weeks of a whole month, so at least one of the meetings a week
      // before and a week after today is in it.
      await expect(weekApart.first()).toBeVisible();
      await expect(main.getByRole("button", {name: /^calendar\.this_month$/i})).toBeDisabled();
      await expect(main.getByRole("button", {name: /^calendar\.today$/i})).toHaveCount(0);
    });

    await test.step("the view is restored after a reload", async () => {
      await page.reload();
      await disableTranslations(page);
      await expectCalendarMode(page, "month");
      await expect(main.getByRole("radio", {name: STAFF.name})).toBeChecked();
      await expect(today).toBeVisible();
    });

    await test.step("a meeting block opens the meeting", async () => {
      await today.click();
      await expect(viewHeading(page)).toBeVisible();
      await expect(page.locator("#meeting_edit")).toContainText(artifact().adultClientInfos[1]!.name);
    });
  });

  readOnlyTest("the calendar shows the meetings of the selected staff members only", {tag: "@ui"}, async ({page}) => {
    const {todayMeeting, groupMeeting} = artifact();
    await login(page, STAFF);
    const main = page.locator("main");
    const group = meetingBlocks(page, groupMeeting.id);
    const noSelection = main.getByText("calendar.select_resource_to_show_calendar");
    const header = (name: string) => main.getByRole("button", {name, exact: true});

    await test.step("day view: a column per ticked staff member", async () => {
      await openCalendar(page, FACILITY.url, {mode: "day", date: groupMeeting.date, resources: []});
      await expect(noSelection).toBeVisible();
      await expect(group).toHaveCount(0);
      // The group meeting has both staff members.
      await resourceInput(page, "day", STAFF.name).check();
      await expect(noSelection).toHaveCount(0);
      await expect(group).toHaveCount(1);
      await expect(header(STAFF.name)).toBeVisible();
      await expect(header(STAFF_ADMIN.name)).toHaveCount(0);
      await resourceInput(page, "day", STAFF_ADMIN.name).check();
      await expect(group).toHaveCount(2);
      await expect(header(STAFF_ADMIN.name)).toBeVisible();
      await resourceInput(page, "day", STAFF.name).uncheck();
      await expect(group).toHaveCount(1);
      await expect(header(STAFF.name)).toHaveCount(0);
      await resourceInput(page, "day", STAFF_ADMIN.name).uncheck();
      await expect(group).toHaveCount(0);
      await expect(noSelection).toBeVisible();
    });

    await test.step("week view: the meetings of the one chosen staff member", async () => {
      // Today's meeting is with the logged in staff member only.
      await openCalendar(page, FACILITY.url, {mode: "week", date: seededDay(0), resources: [STAFF_ADMIN.name]});
      const today = meetingBlocks(page, todayMeeting.id);
      const myCalendar = main.getByRole("button", {name: "calendar.show_my_calendar"});
      await expect(noSelection).toHaveCount(0);
      await expect(today).toHaveCount(0);
      await expect(myCalendar).toBeEnabled();
      await resourceInput(page, "week", STAFF.name).check();
      await expect(today).toBeVisible();
      await expect(resourceInput(page, "week", STAFF_ADMIN.name)).not.toBeChecked();
      await expect(myCalendar).toBeDisabled();
      await resourceInput(page, "week", STAFF_ADMIN.name).check();
      await expect(today).toHaveCount(0);
      await myCalendar.click();
      await expect(resourceInput(page, "week", STAFF.name)).toBeChecked();
      await expect(today).toBeVisible();
    });

    await test.step("a column header of the day view leads to the week view of that staff member", async () => {
      await switchCalendarMode(page, "day");
      await resourceInput(page, "day", STAFF_ADMIN.name).check();
      await header(STAFF_ADMIN.name).click();
      await expectCalendarMode(page, "week");
      await expect(resourceInput(page, "week", STAFF_ADMIN.name)).toBeChecked();
      await expect(meetingBlocks(page, todayMeeting.id)).toHaveCount(0);
    });
  });

  readOnlyTest("a link to the calendar selects the staff member it names", {tag: "@ui"}, async ({page}) => {
    const {staffAdminUserId, groupMeeting, todayMeeting} = artifact();
    await login(page, STAFF);

    await test.step("the calendar link on the staff details page", async () => {
      await openPage(page, `/${FACILITY.url}/staff/${staffAdminUserId}`);
      await page.locator("main").getByRole("link", {name: "facility_user.show_calendar"}).click();
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/calendar$`));
      await expectCalendarMode(page, "week");
      await expect(resourceInput(page, "week", STAFF_ADMIN.name)).toBeChecked();
      await expect(resourceInput(page, "week", STAFF.name)).not.toBeChecked();
    });

    await test.step("a link opened directly, as in a new tab", async () => {
      const params = new URLSearchParams({mode: "day", date: groupMeeting.date, resources: staffAdminUserId});
      await openPage(page, `/${FACILITY.url}/calendar?${params}`);
      await expectCalendarMode(page, "day");
      await expect(resourceInput(page, "day", STAFF_ADMIN.name)).toBeChecked();
      await expect(meetingBlocks(page, groupMeeting.id)).toHaveCount(1);
      // The view parameters are consumed.
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/calendar$`));
    });

    await test.step("a link to a meeting shows its day and its staff", async () => {
      await openPage(page, `/${FACILITY.url}/calendar?${new URLSearchParams({meetingId: todayMeeting.id})}`);
      await expect(meetingBlocks(page, todayMeeting.id)).toHaveCount(1);
      await expect(resourceInput(page, "day", STAFF.name)).toBeChecked();
      await expect(page).toHaveURL(new RegExp(`/${FACILITY.url}/calendar$`));
    });
  });

  test(
    "a meeting resource has its own calendar column, with the meetings using it",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, todayMeeting, groupMeeting} = artifact();
      const adminApi = await api.loggedInAs(STAFF_ADMIN);
      const roomId = await createMeetingResource(adminApi, facilityId, ROOM);
      await adminApi.patchMeeting(facilityId, groupMeeting.id, {resources: [{resourceDictId: roomId}]});

      await login(page, STAFF);
      await openCalendar(page, FACILITY.url, {mode: "day", date: groupMeeting.date, resources: [ROOM]});
      const main = page.locator("main");
      const header = main.getByRole("button", {name: ROOM, exact: true});
      const group = meetingBlocks(page, groupMeeting.id);
      await expect(header).toBeVisible();
      await expect(group).toHaveCount(1);
      await expect(group).toContainText(ROOM);
      await resourceInput(page, "day", STAFF.name).check();
      await expect(group).toHaveCount(2);

      await test.step("the column header leads to the week view of the resource", async () => {
        await header.click();
        await expectCalendarMode(page, "week");
        await expect(resourceInput(page, "week", ROOM)).toBeChecked();
        await expect(group).toHaveCount(1);
      });

      await test.step("meetings without the resource are not in its column", async () => {
        await openCalendar(page, FACILITY.url, {mode: "day", date: todayMeeting.date, resources: []});
        const today = meetingBlocks(page, todayMeeting.id);
        // Both columns are still selected: the resource's and the staff member's.
        await expect(header).toBeVisible();
        await expect(today).toHaveCount(1);
        await resourceInput(page, "day", STAFF.name).uncheck();
        await expect(header).toBeVisible();
        await expect(today).toHaveCount(0);
      });
    },
  );

  test(
    "clicking a time slot in the calendar opens the create form; the meeting is created",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, todayMeeting, adultClientInfos, customTypeIds} = artifact();
      const [diana, eve] = [adultClientInfos[3]!, adultClientInfos[4]!];
      const staffApi = await api.loggedInAs(STAFF);
      await login(page, STAFF);
      await openCalendar(page, FACILITY.url, {mode: "day", date: seededDay(0), resources: [STAFF.name]});
      await clickSlotBelowMeeting(page, meetingBlocks(page, todayMeeting.id), {
        durationMinutes: TODAY_MEETING_MINUTES,
        minutesAfterEnd: SLOT.minutesAfterEnd,
      });
      await expect(page.getByRole("heading", {name: "forms.meeting_create.form_name"})).toBeVisible();
      const form = page.locator("#meeting_create");

      // The slot gives the date and the start time, the column gives the staff member.
      await expect(formField(form, "date")).toHaveValue(seededDay(0));
      await expect(formField(form, "time.startTime")).toHaveValue(SLOT.time);
      await expect(formSelect(form, "staff.0.userId")).toContainText(STAFF.name);
      await expect(formSelect(form, "statusDictId")).toContainText("dictionary.meetingStatus.planned");

      // The type brings its default duration.
      await chooseInFormSelect(page, "typeDictId", /Integration Test Therapy/);
      await expect(formField(form, "time.endTime")).toHaveValue("12:15");
      await chooseInFormSelect(page, "clients.0.userId", new RegExp(eve.name));
      await expect(formSelect(form, "clients.0.userId")).toContainText(eve.name);
      // A second client, in a row added with the "add" button.
      await form.locator("title=forms.meeting.add_attendant.clients").click();
      await chooseInFormSelect(page, "clients.1.userId", new RegExp(diana.name));
      await formField(form, "isRemote").check();
      await form.getByRole("textbox", {name: "forms.meeting_create.field_names.notes"}).fill("Made in the calendar");
      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_create");
      await expect(form).toHaveCount(0);

      const created = await meetingsStartingAt(staffApi, facilityId, SLOT.startDayminute, seededDay(0));
      expect(created).toHaveLength(1);
      const dicts = await staffApi.dictionaries();
      expect(created[0]).toMatchObject({
        date: seededDay(0),
        durationMinutes: 60,
        typeDictId: customTypeIds.therapy,
        statusDictId: dicts.meetingStatus!.planned!,
        isRemote: true,
        notes: "Made in the calendar",
        fromMeetingId: null,
        staff: [{userId: staffUserId}],
        clients: [{userId: eve.id}, {userId: diana.id}],
        resources: [],
      });
      const block = meetingBlocks(page, created[0]!.id);
      await expect(block).toBeVisible();
      await expect(block).toContainText(eve.name);
      await expect(block).toContainText("Made in the calendar");
    },
  );

  test(
    "a meeting is created with no client, with a status, notes and resources; the modal and the list show them",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, todayMeeting, customTypeIds} = artifact();
      const adminApi = await api.loggedInAs(STAFF_ADMIN);
      const roomId = await createMeetingResource(adminApi, facilityId, ROOM);
      const projectorId = await createMeetingResource(adminApi, facilityId, PROJECTOR);
      const staffApi = await api.loggedInAs(STAFF);
      await login(page, STAFF);
      await openCalendar(page, FACILITY.url, {mode: "day", date: seededDay(0), resources: [STAFF.name]});
      await clickSlotBelowMeeting(page, meetingBlocks(page, todayMeeting.id), {
        durationMinutes: TODAY_MEETING_MINUTES,
        minutesAfterEnd: SLOT.minutesAfterEnd,
      });
      const form = page.locator("#meeting_create");
      await chooseInFormSelect(page, "typeDictId", /Integration Test Therapy/);
      // The time of the slot is shown as a text until asked for the fields.
      await expect(formField(form, "time.endTime")).toBeHidden();
      await form.locator('[data-field-box="dateAndTime"]').getByRole("button", {name: "actions.edit"}).click();
      await formField(form, "time.endTime").fill("13:00");
      await chooseInFormSelect(page, "statusDictId", /meetingStatus\.completed/);
      await form.getByRole("textbox", {name: "forms.meeting_create.field_names.notes"}).fill(NOTES);
      // The list closes after each choice.
      await chooseInFormSelect(page, "resources", PROJECTOR);
      await chooseInFormSelect(page, "resources", ROOM);
      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_create");
      await expect(form).toHaveCount(0);

      const created = await meetingsStartingAt(staffApi, facilityId, SLOT.startDayminute, seededDay(0));
      expect(created).toHaveLength(1);
      const dicts = await staffApi.dictionaries();
      expect(created[0]).toMatchObject({
        date: seededDay(0),
        durationMinutes: 105,
        typeDictId: customTypeIds.therapy,
        statusDictId: dicts.meetingStatus!.completed!,
        isRemote: false,
        notes: NOTES,
        staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
        clients: [],
      });
      // The server gives the resources of a meeting in no order of its own.
      expect(created[0]!.resources.map(({resourceDictId}) => resourceDictId).toSorted()).toEqual(
        [roomId, projectorId].toSorted(),
      );

      await test.step("the view mode of the modal", async () => {
        await meetingBlocks(page, created[0]!.id).click();
        await expect(viewHeading(page)).toBeVisible();
        const view = page.locator("#meeting_edit");
        const dateAndTime = view.locator('[data-field-box="dateAndTime"]');
        // The browsers differ in the padding of the hour.
        await expect(dateAndTime).toContainText(/11:15\s*–\s*13:00/);
        await expect(dateAndTime).toContainText("calendar.duration.hours_minutes{hours:1,minutes:45}");
        await expect(formSelect(view, "typeDictId")).toContainText("Integration Test Therapy");
        await expect(formSelect(view, "statusDictId")).toContainText("dictionary.meetingStatus.completed");
        await expect(view.getByRole("link", {name: STAFF.name})).toBeVisible();
        await expect(
          view.getByText("forms.meeting.field_names.clients__interval{postProcess:interval,count:0}"),
        ).toBeVisible();
        await expect(formField(view, "isRemote")).not.toBeChecked();
        await expect(view.locator('[data-field-box="notes"]')).toContainText(/First line\s*Second line/);
        await expect(formSelect(view, "resources")).toContainText(ROOM);
        await expect(formSelect(view, "resources")).toContainText(PROJECTOR);
        await page.keyboard.press("Escape");
        await expect(viewHeading(page)).toHaveCount(0);
      });

      await test.step("the row of the meetings list", async () => {
        await openPage(page, `/${FACILITY.url}/meetings`);
        const row = tableRows(page.locator("main"), "First line");
        await expect(row).toHaveCount(1);
        await expect
          .poll(() =>
            tableCellTexts(row, [
              "date",
              "startDayminute",
              "typeDictId",
              "statusDictId",
              "staff.*.userId",
              "clients.*.userId",
              "isRemote",
              "notes",
              "resources.*.dictId",
            ]),
          )
          .toEqual({
            "date": shownTableDate(seededDay(0)),
            "startDayminute": "11:15 – 13:00",
            "typeDictId": expect.stringContaining("Integration Test Therapy"),
            "statusDictId": "dictionary.meetingStatus.completed",
            "staff.*.userId": STAFF.name,
            "clients.*.userId": "",
            "isRemote": "bool_values.no",
            "notes": "First line Second line",
            "resources.*.dictId": expect.stringMatching(new RegExp(`^(${ROOM} ${PROJECTOR}|${PROJECTOR} ${ROOM})$`)),
          });
      });
    },
  );

  test("an all-day meeting is created with the all-day box of the create form", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await login(page, STAFF);
    await openCalendar(page, FACILITY.url, {mode: "day", date: seededDay(0), resources: [STAFF.name]});
    await clickSlotBelowMeeting(page, meetingBlocks(page, todayMeeting.id), {
      durationMinutes: TODAY_MEETING_MINUTES,
      minutesAfterEnd: SLOT.minutesAfterEnd,
    });
    const form = page.locator("#meeting_create");
    await chooseInFormSelect(page, "typeDictId", /Integration Test Therapy/);
    await form.locator('[data-field-box="dateAndTime"]').getByRole("button", {name: "actions.edit"}).click();
    await formField(form, "time.allDay").check();
    // The times are gone from the form; the date stays.
    await expect(formField(form, "time.startTime")).toHaveCount(0);
    await expect(formField(form, "time.endTime")).toBeDisabled();
    await expect(formField(form, "date")).toHaveValue(seededDay(0));
    await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
    await expectFormSuccess(page, "meeting_create");

    const created = await meetingsStartingAt(staffApi, facilityId, 0, seededDay(0));
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({date: seededDay(0), durationMinutes: 24 * 60});
    await meetingBlocks(page, created[0]!.id).click();
    await expect(viewHeading(page)).toBeVisible();
    const dateAndTime = page.locator("#meeting_edit").locator('[data-field-box="dateAndTime"]');
    await expect(dateAndTime).toContainText("calendar.all_day");
    await expect(dateAndTime).not.toContainText(/\d:\d\d/);
  });

  readOnlyTest("the create form without a meeting type is not accepted", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await login(page, STAFF);
    await openCalendar(page, FACILITY.url, {mode: "day", date: seededDay(0), resources: [STAFF.name]});
    await clickSlotBelowMeeting(page, meetingBlocks(page, todayMeeting.id), {
      durationMinutes: TODAY_MEETING_MINUTES,
      minutesAfterEnd: SLOT.minutesAfterEnd,
    });
    const form = page.locator("#meeting_create");
    await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
    await expectFormErrors(form, {typeDictId: "required"});
    await expect(page.getByText("forms.meeting_create.success")).toHaveCount(0);
    await form.getByRole("button", {name: "actions.cancel"}).click();
    await expect(form).toHaveCount(0);
    expect(await meetingsStartingAt(staffApi, facilityId, SLOT.startDayminute, seededDay(0))).toEqual([]);
  });

  test("the create form makes a weekly series, skipping the unticked dates", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await login(page, STAFF);
    await openCalendar(page, FACILITY.url, {mode: "day", date: seededDay(0), resources: [STAFF.name]});
    await clickSlotBelowMeeting(page, meetingBlocks(page, todayMeeting.id), {
      durationMinutes: TODAY_MEETING_MINUTES,
      minutesAfterEnd: SLOT.minutesAfterEnd,
    });
    const form = page.locator("#meeting_create");
    await chooseInFormSelect(page, "typeDictId", /Integration Test Therapy/);
    await formField(form, "createSeries").check();
    await form.getByText("meetings.interval_labels.7d").click();

    // One checkbox per date after the first one; holidays start unticked.
    const dateCheckboxes = form.locator('input[name^="seriesIncludeDate."]');
    await expect(dateCheckboxes).toHaveCount(9);
    const names = await dateCheckboxes.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).name));
    expect(names).toEqual(Array.from({length: 9}, (_, i) => `seriesIncludeDate.${seededDay(7 * (i + 1))}`));
    const skipped = seededDay(14);
    await form.locator(`input[name="seriesIncludeDate.${skipped}"]`).uncheck();
    const expectedDates = [seededDay(0), ...(await checkedSeriesDates(form))];
    expect(expectedDates).not.toContain(skipped);
    expect(expectedDates.length).toBeGreaterThanOrEqual(5);
    await expect(form).toContainText(`number_of_meetings.total{count:${expectedDates.length}}`);

    await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
    await expectFormSuccess(page, "meeting_series_create");
    const created = await meetingsStartingAt(staffApi, facilityId, SLOT.startDayminute, seededDay(0));
    expect(created.map((m) => m.date)).toEqual(expectedDates);
    const first = created[0]!;
    for (const meeting of created) {
      expect(meeting).toMatchObject({fromMeetingId: first.id, interval: "7d", durationMinutes: 60});
      expect(meeting.staff).toEqual(first.staff);
    }
    await expect(meetingBlocks(page, first.id)).toBeVisible();
  });

  readOnlyTest("hovering a meeting block shows a card with the attendants", {tag: "@ui"}, async ({page}) => {
    const {todayMeeting, adultClientInfos} = artifact();
    const bea = adultClientInfos[1]!;
    await login(page, STAFF);
    await openCalendar(page, FACILITY.url, {mode: "week", date: seededDay(0), resources: [STAFF.name]});
    const block = meetingBlocks(page, todayMeeting.id);
    await expect(block).toBeVisible();
    await expect(block).toContainText(bea.name);
    // The card lists the staff too; the block, in the staff member's column, only the clients.
    await expect(block).not.toContainText(STAFF.name);
    const card = page.locator('[data-role="meeting-hover-card"]');
    await expect(card).toHaveCount(0);
    await block.hover();
    await expect(card).toBeVisible();
    await expect(card).toContainText(STAFF.name);
    await expect(card).toContainText(bea.name);
    await expect(card).toContainText("dictionary.meetingType.other");
    await page.mouse.move(0, 0);
    await expect(card).toHaveCount(0);
  });

  readOnlyTest(
    "a date of the month view opens its week; a day of the small calendar moves the view",
    {tag: "@ui"},
    async ({page}) => {
      const {todayMeeting, futureMeeting} = artifact();
      const nextWeek = seededDay(7);
      await login(page, STAFF);
      await openCalendar(page, FACILITY.url, {mode: "month", date: nextWeek, resources: [STAFF.name]});
      const main = page.locator("main");
      const today = meetingBlocks(page, todayMeeting.id);
      const future = meetingBlocks(page, futureMeeting.id);

      await test.step("the date in the month cell switches to the week view of that date", async () => {
        // The date buttons carry the full date as their title, in the browser's locale.
        const title = DateTime.fromISO(nextWeek).toLocaleString(DateTime.DATE_HUGE, {locale: BROWSER_LOCALE});
        await main.locator(`title=${title}`).click();
        await expectCalendarMode(page, "week");
        await expect(future).toBeVisible();
        await expect(today).toHaveCount(0);
      });

      await test.step("a day clicked in the small calendar brings its week", async () => {
        const seededDate = seededDay(0);
        // The small calendar shows the month of the selection, which the seeded day may be before.
        if (DateTime.fromISO(seededDate).month !== DateTime.fromISO(nextWeek).month) {
          await main.locator('[data-role="prev-month"]').click();
        }
        await main.locator(`[data-day="${seededDate}"]`).click();
        await expect(today).toBeVisible();
        await expect(future).toHaveCount(0);
        await expectCalendarMode(page, "week");
      });
    },
  );

  readOnlyTest(
    "the small calendar: double click on a day, the month name, the list of years",
    {tag: "@ui"},
    async ({page}) => {
      const {todayMeeting, futureMeeting} = artifact();
      await login(page, STAFF);
      await openCalendar(page, FACILITY.url, {mode: "week", date: seededDay(0), resources: [STAFF.name]});
      const main = page.locator("main");
      const today = meetingBlocks(page, todayMeeting.id);
      const future = meetingBlocks(page, futureMeeting.id);
      // The small calendar shows the month of the middle of the week, a week of the browser's locale.
      const seededYear = DateTime.fromISO(seededDay(0), {locale: BROWSER_LOCALE})
        .startOf("week", {useLocaleWeeks: true})
        .plus({days: 3}).year;
      const yearButton = main.locator('[data-role="year"]');
      await expect(yearButton).toHaveText(String(seededYear));
      await expect(today).toBeVisible();

      await test.step("a double click on a day switches between the day and the week view of it", async () => {
        const seededDayButton = main.locator(`[data-day="${seededDay(0)}"]`);
        await seededDayButton.dblclick();
        await expectCalendarMode(page, "day");
        await expect(today).toBeVisible();
        await seededDayButton.dblclick();
        await expectCalendarMode(page, "week");
        await expect(today).toBeVisible();
      });

      await test.step("the month name opens the month view", async () => {
        await main.locator('[data-role="month"]').click();
        await expectCalendarMode(page, "month");
        await expect(today).toBeVisible();
      });

      await test.step("a year from the list moves the small calendar only; the return button brings it back", async () => {
        await switchCalendarMode(page, "week");
        await yearButton.click();
        await page.getByRole("button", {name: String(seededYear + 1), exact: true}).click();
        await expect(yearButton).toHaveText(String(seededYear + 1));
        await expect(today).toBeVisible();
        await expect(future).toHaveCount(0);
        // Away from the current month the return button goes back to it; the layer was seeded today.
        await main.locator("title=calendar.go_to_current_month").click();
        await expect(yearButton).toHaveText(String(seededYear));
      });
    },
  );
});
