import {DateTime} from "luxon";
import type {Page} from "@playwright/test";
import {openMeetingModal} from "../helpers/calendar.ts";
import {addDays, dateOffset} from "../lib/dates.ts";
import {ADMIN, FACILITY, STAFF} from "../lib/layers/facility.ts";
import {notificationsLayer} from "../lib/layers/notifications.ts";
import {chooseInFormSelect, expectFormSuccess, formField, submitButton, tableRows} from "../helpers/selectors.ts";
import {expect, login, MemoAPI, openPage, readOnlyTest, test} from "../lib/test.ts";
import {expectValidationErrors, responseData} from "../lib/responses.ts";
import {meetingClients} from "../helpers/queries.ts";

/**
 * Notifications of meetings: the records made for the clients of a meeting, and what happens to
 * them as the meeting changes. Sending is a backend job talking to an SMS gateway, and is not
 * tested here — all the meetings are far enough for nothing to be due.
 */

interface NotificationRow {
  readonly "id": string;
  readonly "user.id": string | null;
  readonly "user.name": string | null;
  readonly "meetingId": string | null;
  readonly "status": string;
  readonly "scheduledAt": string;
  readonly "address": string | null;
  readonly "subject": string;
  readonly "message": string | null;
}

const NOTIFICATION_COLUMNS = [
  "id",
  "user.id",
  "user.name",
  "meetingId",
  "status",
  "scheduledAt",
  "address",
  "subject",
  "message",
] as const;

/** The facility's notifications, of one meeting or all of them, as the facility admin sees them. */
async function notifications(adminApi: MemoAPI, facilityId: string, meetingId?: string) {
  const {rows} = await adminApi.tquery<NotificationRow>(`facility/${facilityId}/notification/tquery`, {
    columns: NOTIFICATION_COLUMNS,
    filter: meetingId ? {type: "column", column: "meetingId", op: "=", val: meetingId} : undefined,
    sort: [{column: "scheduledAt"}, {column: "user.name"}],
  });
  return rows;
}

async function appTimeZone(api: MemoAPI) {
  return (await api.getData<{userTimezone: string}>("system/status")).userTimezone;
}

/** The moment it is the given full hour of the given date (`YYYY-MM-DD`) in the time zone. */
function zonedHour(date: string, hour: number, timeZone: string) {
  return DateTime.fromISO(date, {zone: timeZone}).set({hour});
}

/**
 * When the notification of a meeting is to be sent: two days before the meeting, at 12:00, 14:00
 * or 16:00 of the app's time zone — the latest of them that is not after the meeting's time of day.
 */
function expectedSendTime(meetingDate: string, startDayminute: number, timeZone: string) {
  const hour = startDayminute >= 16 * 60 ? 16 : startDayminute >= 14 * 60 ? 14 : 12;
  return zonedHour(addDays(meetingDate, -2), hour, timeZone).toUTC().toISO();
}

function sendTimes(rows: readonly {readonly scheduledAt: string}[]) {
  return rows.map(({scheduledAt}) => DateTime.fromISO(scheduledAt).toUTC().toISO());
}

/** Opens the details of the meeting — one that has STAFF among its staff — from the calendar. */
async function openMeeting(page: Page, meeting: {readonly id: string; readonly date: string}) {
  await login(page, STAFF);
  await openMeetingModal(page, FACILITY.url, meeting, STAFF.name);
}

const TEMPLATE_PLACEHOLDER = "{{meeting_facility_template_subject}}";

notificationsLayer.describe((artifact) => {
  readOnlyTest("a meeting's notification is listed for the admin and shown on the meeting's client", async ({api}) => {
    const {facilityId, notifiedMeeting, adultClientInfos, smsMethodId} = artifact();
    const [adam, bea] = adultClientInfos;
    const adminApi = await api.loggedInAs(ADMIN);
    const timeZone = await appTimeZone(adminApi);

    const all = await notifications(adminApi, facilityId);
    expect(all).toEqual([
      expect.objectContaining({
        "user.id": adam!.id,
        "user.name": adam!.name,
        "meetingId": notifiedMeeting.id,
        "status": "scheduled",
        // Filled in from the facility's template and the client's phone number at the time of sending.
        "subject": TEMPLATE_PLACEHOLDER,
        "address": null,
        "message": null,
      }),
    ]);
    expect(sendTimes(all)).toEqual([expectedSendTime(notifiedMeeting.date, 600, timeZone)]);
    expect(await notifications(adminApi, facilityId, notifiedMeeting.id)).toEqual(all);

    // Staff do not have the list, but see the notification on the meeting.
    const staffApi = await api.loggedInAs(STAFF);
    const clients = await meetingClients(staffApi, facilityId, notifiedMeeting.id);
    expect(clients.map(({userId}) => userId)).toEqual([adam!.id, bea!.id]);
    expect(clients[0]!.notifications).toEqual([
      expect.objectContaining({id: all[0]!.id, status: "scheduled", notificationMethodDictId: smsMethodId}),
    ]);
    expect(clients[1]!.notifications).toEqual([]);
  });

  readOnlyTest("a notification with an unknown method is rejected", async ({api}) => {
    const {facilityId, adultClientInfos} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const adminApi = await api.loggedInAs(ADMIN);
    const {meetingType, meetingStatus, attendanceStatus} = await staffApi.dictionaries();
    const res = await staffApi.createMeeting(
      facilityId,
      {
        typeDictId: meetingType!.other!,
        date: dateOffset(12),
        startDayminute: 600,
        durationMinutes: 60,
        statusDictId: meetingStatus!.planned!,
        clients: [
          {
            userId: adultClientInfos[0]!.id,
            attendanceStatusDictId: attendanceStatus!.ok!,
            // A position of another dictionary.
            notifications: [{notificationMethodDictId: meetingStatus!.planned!}],
          },
        ],
      },
      {allowFailure: true},
    );
    await expectValidationErrors(res, [
      {field: "clients.0.notifications.0.notificationMethodDictId", code: "validation.custom.position_in_dictionary"},
    ]);
    expect(await notifications(adminApi, facilityId)).toHaveLength(1);
  });

  test("notification is skipped while the meeting or the client's attendance is off", async ({api}) => {
    const {facilityId, notifiedMeeting, adultClientInfos, smsMethodId} = artifact();
    const [adam, bea] = adultClientInfos;
    const staffApi = await api.loggedInAs(STAFF);
    const adminApi = await api.loggedInAs(ADMIN);
    const {meetingStatus, attendanceStatus} = await staffApi.dictionaries();
    const status = async () => (await notifications(adminApi, facilityId, notifiedMeeting.id)).map((n) => n.status);
    const setMeetingStatus = (name: string) =>
      staffApi.patchMeeting(facilityId, notifiedMeeting.id, {statusDictId: meetingStatus![name]!});
    const setAdamsAttendance = (name: string) =>
      staffApi.patchMeeting(facilityId, notifiedMeeting.id, {
        clients: [
          {
            userId: adam!.id,
            attendanceStatusDictId: attendanceStatus![name]!,
            notifications: [{notificationMethodDictId: smsMethodId}],
          },
          {userId: bea!.id, attendanceStatusDictId: attendanceStatus!.ok!, notifications: []},
        ],
      });
    const {id} = (await notifications(adminApi, facilityId, notifiedMeeting.id))[0]!;

    await setMeetingStatus("cancelled");
    expect(await status()).toEqual(["skipped"]);
    await setMeetingStatus("planned");
    expect(await status()).toEqual(["scheduled"]);
    await setMeetingStatus("completed");
    expect(await status()).toEqual(["skipped"]);
    await setMeetingStatus("planned");

    await setAdamsAttendance("cancelled");
    expect(await status()).toEqual(["skipped"]);
    expect((await meetingClients(staffApi, facilityId, notifiedMeeting.id))[0]!.notifications).toEqual([
      expect.objectContaining({id, status: "skipped"}),
    ]);
    await setAdamsAttendance("ok");
    expect(await status()).toEqual(["scheduled"]);
    // The same record all along.
    expect((await notifications(adminApi, facilityId)).map((n) => n.id)).toEqual([id]);
  });

  test("the time of sending follows the meeting's date and time", async ({api}) => {
    const {facilityId, notifiedMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const adminApi = await api.loggedInAs(ADMIN);
    const timeZone = await appTimeZone(adminApi);
    const {id} = (await notifications(adminApi, facilityId, notifiedMeeting.id))[0]!;
    for (const [date, startDayminute] of [
      [dateOffset(20), 600],
      [dateOffset(20), 14 * 60 + 30],
      [dateOffset(21), 16 * 60],
      [dateOffset(21), 23 * 60],
      [dateOffset(21), 0],
    ] as const) {
      // A patch that does not name the clients leaves their notifications in place.
      await staffApi.patchMeeting(facilityId, notifiedMeeting.id, {date, startDayminute});
      const rows = await notifications(adminApi, facilityId, notifiedMeeting.id);
      expect(sendTimes(rows), `${date} ${startDayminute}`).toEqual([expectedSendTime(date, startDayminute, timeZone)]);
      expect(rows[0]).toMatchObject({id, status: "scheduled", subject: TEMPLATE_PLACEHOLDER});
    }
  });

  test("notification goes away with the request for it, with its client and with the meeting", async ({api}) => {
    const {facilityId, notifiedMeeting, adultClientInfos, smsMethodId} = artifact();
    const [adam, bea] = adultClientInfos;
    const staffApi = await api.loggedInAs(STAFF);
    const adminApi = await api.loggedInAs(ADMIN);
    const {attendanceStatus} = await staffApi.dictionaries();
    const ok = attendanceStatus!.ok!;
    const sms = [{notificationMethodDictId: smsMethodId}];
    const notified = async () =>
      (await notifications(adminApi, facilityId, notifiedMeeting.id)).map((n) => n["user.name"]);
    const setClients = (clients: readonly (readonly [string, boolean])[]) =>
      staffApi.patchMeeting(facilityId, notifiedMeeting.id, {
        clients: clients.map(([userId, notify]) => ({
          userId,
          attendanceStatusDictId: ok,
          notifications: notify ? sms : [],
        })),
      });
    const originalId = (await notifications(adminApi, facilityId, notifiedMeeting.id))[0]!.id;

    await setClients([
      [adam!.id, false],
      [bea!.id, false],
    ]);
    expect(await notified()).toEqual([]);
    expect((await meetingClients(staffApi, facilityId, notifiedMeeting.id)).map((c) => c.userId)).toEqual([
      adam!.id,
      bea!.id,
    ]);

    await setClients([
      [adam!.id, true],
      [bea!.id, true],
    ]);
    expect(await notified()).toEqual([adam!.name, bea!.name]);
    expect((await notifications(adminApi, facilityId)).map((n) => n.id)).not.toContain(originalId);

    // Without Adam among the clients, his notification has nothing to be about.
    await setClients([[bea!.id, true]]);
    expect(await notified()).toEqual([bea!.name]);

    await staffApi.delete(`facility/${facilityId}/meeting/${notifiedMeeting.id}`);
    expect(await notifications(adminApi, facilityId)).toEqual([]);
  });

  test("copies of a meeting get notifications of their own", async ({api}) => {
    const {facilityId, notifiedMeeting, adultClientInfos} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const adminApi = await api.loggedInAs(ADMIN);
    const timeZone = await appTimeZone(adminApi);
    const dates = [addDays(notifiedMeeting.date, 7), addDays(notifiedMeeting.date, 14)];
    const res = await staffApi.post(`facility/${facilityId}/meeting/${notifiedMeeting.id}/clone`, {
      dates,
      interval: "7d",
    });
    const {ids} = await responseData<{ids: string[]}>(res);
    expect(ids).toHaveLength(2);
    const all = await notifications(adminApi, facilityId);
    expect(all.map((n) => n.meetingId)).toEqual([notifiedMeeting.id, ...ids]);
    expect(sendTimes(all)).toEqual(
      [notifiedMeeting.date, ...dates].map((date) => expectedSendTime(date, 600, timeZone)),
    );
    for (const row of all) {
      expect(row).toMatchObject({"user.id": adultClientInfos[0]!.id, "status": "scheduled", "address": null});
    }
    expect(new Set(all.map((n) => n.id)).size).toBe(3);
  });

  test("admin adds notifications to a client's coming meetings in one request", async ({api}) => {
    const {facilityId, futureMeeting, groupMeeting, notifiedMeeting, adultClientInfos, smsMethodId} = artifact();
    const [adam, , carl, diana] = adultClientInfos;
    const adminApi = await api.loggedInAs(ADMIN);
    const staffApi = await api.loggedInAs(STAFF);
    const path = (clientId: string) => `facility/${facilityId}/user/client/${clientId}/notification/method`;
    const counts = async (clientId: string, body: object) =>
      responseData<{added: number; removed: number}>(await adminApi.patch(path(clientId), body));

    await test.step("by the client's own methods", async () => {
      // Carl has the SMS method, and one coming meeting: the seeded one in a week.
      expect(await counts(carl!.id, {addMeetingClientMethods: true})).toEqual({added: 1, removed: 0});
      expect(await notifications(adminApi, facilityId, futureMeeting.id)).toEqual([
        expect.objectContaining({"user.id": carl!.id, "status": "scheduled", "subject": TEMPLATE_PLACEHOLDER}),
      ]);
      // Nothing more to add the second time.
      expect(await counts(carl!.id, {addMeetingClientMethods: true})).toEqual({added: 0, removed: 0});
      expect(await notifications(adminApi, facilityId, futureMeeting.id)).toHaveLength(1);
      // Adam's coming meeting has its notification already.
      expect(await counts(adam!.id, {addMeetingClientMethods: true})).toEqual({added: 0, removed: 0});
      expect(await notifications(adminApi, facilityId, notifiedMeeting.id)).toHaveLength(1);
      // Diana has no methods of her own.
      expect(await counts(diana!.id, {addMeetingClientMethods: true})).toEqual({added: 0, removed: 0});
    });

    await test.step("by a named method", async () => {
      // Diana is in tomorrow's group meeting, with two more clients, who are not concerned.
      expect(await counts(diana!.id, {addMeetingMethodDictId: smsMethodId})).toEqual({added: 1, removed: 0});
      expect(await notifications(adminApi, facilityId, groupMeeting.id)).toEqual([
        expect.objectContaining({"user.id": diana!.id}),
      ]);
    });

    await test.step("not for staff, and not with a wrong method", async () => {
      // By id: the status of one for a meeting as near as tomorrow may change meanwhile.
      const ids = async () => (await notifications(adminApi, facilityId)).map((n) => n.id);
      const before = await ids();
      expect(before).toHaveLength(3);
      expect(
        (await staffApi.patch(path(carl!.id), {addMeetingClientMethods: true}, {allowFailure: true})).status(),
      ).toBe(403);
      const res = await adminApi.patch(
        path(carl!.id),
        {addMeetingMethodDictId: carl!.typeDictId},
        {allowFailure: true},
      );
      expect(res.status(), await res.text()).toBe(400);
      expect(await ids()).toEqual(before);
    });
  });

  readOnlyTest("notifications page lists the notification, among the coming ones", {tag: "@ui"}, async ({page}) => {
    const {adultClientInfos} = artifact();
    await openPage(page, `/${FACILITY.url}/admin/notifications`, ADMIN);
    const main = page.locator("main");
    const rows = tableRows(main, adultClientInfos[0]!.name);
    const tab = (mode: string) => main.getByRole("tab", {name: `tables.tables.notification.mode.${mode}`});

    await expect(main.getByText("tables.tables.notification.summary{count:1}")).toBeVisible();
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("scheduled");
    // The text is not made up before the sending.
    await expect(rows).toContainText("tables.tables.notification.default_subject");
    await expect(rows.getByRole("link", {name: adultClientInfos[0]!.name})).toBeVisible();

    await tab("past").click();
    await expect(main.getByText("tables.tables.notification.summary{count:0}")).toBeVisible();
    await expect(rows).toHaveCount(0);
    await tab("future").click();
    await expect(main.getByText("tables.tables.notification.summary{count:1}")).toBeVisible();
    await expect(rows).toHaveCount(1);
  });

  readOnlyTest(
    "meeting details show who is notified, and the state of the notification",
    {tag: "@ui"},
    async ({page}) => {
      const {notifiedMeeting, adultClientInfos} = artifact();
      const [adam, bea] = adultClientInfos;
      await openMeeting(page, notifiedMeeting);
      await page.getByRole("button", {name: /^forms\.meeting_edit\.field_names\.notifications$/i}).click();
      const toggles = page.locator("button[aria-checked]");
      await expect(toggles).toHaveCount(2);
      await expect(page.getByRole("link", {name: adam!.name}).last()).toBeVisible();
      await expect(page.getByRole("link", {name: bea!.name}).last()).toBeVisible();
      await expect(toggles.nth(0)).toHaveAttribute("aria-checked", "true");
      await expect(toggles.nth(1)).toHaveAttribute("aria-checked", "false");
      // Not to be changed in the view mode.
      await expect(toggles.nth(0)).toBeDisabled();
      await expect(page.getByText("meetings.notification_methods.edit_meeting_to_modify")).toBeVisible();
      await expect(page.locator('[aria-description^="meetings.notification_info"]')).toHaveCount(1);
      await expect(page.locator('[aria-description^="meetings.notification_info"]')).toHaveAttribute(
        "aria-description",
        /status:scheduled/,
      );
      // Neither is out of line with the client's own setting.
      await expect(page.locator("title=meetings.notification_methods.non_standard")).toHaveCount(0);
    },
  );

  test("notification is turned on for a client in the meeting's edit form", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, futureMeeting, adultClientInfos, smsMethodId} = artifact();
    const carl = adultClientInfos[2]!;
    const adminApi = await api.loggedInAs(ADMIN);
    expect(await notifications(adminApi, facilityId, futureMeeting.id)).toEqual([]);
    await openMeeting(page, futureMeeting);
    await page.getByRole("button", {name: "actions.edit"}).click();
    await expect(page.getByRole("heading", {name: "forms.meeting_edit.form_name"})).toBeVisible();
    const openList = page.getByRole("button", {name: /^forms\.meeting_edit\.field_names\.notifications$/i});
    await openList.click();
    const toggle = page.locator("button[aria-checked]");
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    // Carl has the SMS method set, so a meeting of his without a notification is marked.
    const nonStandard = page.locator("title=meetings.notification_methods.non_standard");
    await expect(nonStandard).toHaveCount(1);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(nonStandard).toHaveCount(0);
    // He has no phone number though.
    await expect(page.locator("title=facility_user.client.notification_method_requires_contact_data")).toBeVisible();
    // A click outside closes the list.
    await page.getByRole("heading", {name: "forms.meeting_edit.form_name"}).click();
    await expect(toggle).toHaveCount(0);
    await submitButton(page, "meeting_edit").click();
    await expectFormSuccess(page, "meeting_edit");

    expect(await notifications(adminApi, facilityId, futureMeeting.id)).toEqual([
      expect.objectContaining({"user.id": carl.id, "status": "scheduled"}),
    ]);
    const staffApi = await api.loggedInAs(STAFF);
    expect((await meetingClients(staffApi, facilityId, futureMeeting.id))[0]!.notifications).toEqual([
      expect.objectContaining({notificationMethodDictId: smsMethodId, status: "scheduled"}),
    ]);
  });

  test(
    "a copy keeps the notifications of the original; a client added to it gets the default ones",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, notifiedMeeting, adultClientInfos} = artifact();
      const [adam, bea, carl] = adultClientInfos;
      const adminApi = await api.loggedInAs(ADMIN);
      await openMeeting(page, notifiedMeeting);
      // The unnamed second half of the split button, next to "create series", opens the menu.
      await page
        .getByRole("button", {name: "meetings.create_series"})
        .locator("xpath=following-sibling::button")
        .click();
      await page.getByRole("button", {name: /meetings\.create_copy\.in_one_week/}).click();
      await expect(page.getByRole("heading", {name: "forms.meeting_create.form_name"})).toBeVisible();
      const form = page.locator("#meeting_create");
      await expect(formField(form, "date")).toHaveValue(addDays(notifiedMeeting.date, 7));
      // With two clients there is an empty third row. Carl is set to get SMS notifications.
      await chooseInFormSelect(page, "clients.2.userId", new RegExp(carl!.name));

      await form.getByRole("button", {name: /^forms\.meeting_create\.field_names\.notifications$/i}).click();
      const toggles = page.locator("button[aria-checked]");
      await expect(toggles).toHaveCount(3);
      await expect(toggles.nth(0)).toHaveAttribute("aria-checked", "true");
      await expect(toggles.nth(1)).toHaveAttribute("aria-checked", "false");
      await expect(toggles.nth(2)).toHaveAttribute("aria-checked", "true");
      await expect(page.locator("title=meetings.notification_methods.non_standard")).toHaveCount(0);
      await page.getByRole("heading", {name: "forms.meeting_create.form_name"}).click();
      await expect(toggles).toHaveCount(0);
      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_create");

      const all = await notifications(adminApi, facilityId);
      const created = all.filter((n) => n.meetingId !== notifiedMeeting.id);
      expect(all).toHaveLength(3);
      expect(created.map((n) => n["user.id"]).toSorted()).toEqual([adam!.id, carl!.id].toSorted());
      expect(created.map((n) => n.status)).toEqual(["scheduled", "scheduled"]);
      expect(new Set(created.map((n) => n.meetingId)).size).toBe(1);
      const staffApi = await api.loggedInAs(STAFF);
      const clients = await meetingClients(staffApi, facilityId, created[0]!.meetingId!);
      expect(clients.map((c) => [c.userId, c.notifications.length])).toEqual([
        [adam!.id, 1],
        [bea!.id, 0],
        [carl!.id, 1],
      ]);
    },
  );
});
