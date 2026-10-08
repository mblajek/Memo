import {
  meetingsListTab,
  openMeeting,
  reopenMeeting,
  saveEdit,
  shownTableRows,
  startEditing,
} from "../helpers/meetings.ts";
import type {Locator, Page} from "@playwright/test";
import {clickSlotBelowMeeting, meetingBlocks, openCalendar} from "../helpers/calendar.ts";
import {addDays} from "../lib/dates.ts";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import {meetingsWithGroupsLayer} from "../lib/layers/meetings.ts";
import {chooseInFormSelect, expectFormSuccess, expectSectionShown, formSelect} from "../helpers/selectors.ts";
import {expect, login, MemoAPI, openPage, test} from "../lib/test.ts";
import {meetingClients} from "../helpers/queries.ts";

/**
 * Client groups in the UI of the meetings: the group of the clients in the meeting form, and the
 * meetings of a client's group on the client details page.
 *
 * The groups of the layer: the family (Adam, Bea, Zoe, Will Kowalski), the pair (Carl and Yara
 * Nowak) and the mixed one (Adam Kowalski, Xander and Violet Wisniewski). No seeded meeting has a
 * group on its clients.
 */

/**
 * Checks that the server gives the groups of the client in the given order — the order the client
 * joined them in — and returns them. The meeting form offers them in this order, proposing the
 * first.
 */
async function groupsOfClient<G extends {readonly id: string}>(
  api: MemoAPI,
  facilityId: string,
  clientUserId: string,
  groups: readonly G[],
) {
  const {groupIds} = (
    await api.getData<[{client: {groupIds: string[]}}]>(`facility/${facilityId}/user/client/list?in=${clientUserId}`)
  )[0].client;
  expect(groupIds).toEqual(groups.map(({id}) => id));
  return groups;
}

/** Returns the ids of the meetings of the day that start at the given minute. */
async function meetingIdsAt(api: MemoAPI, facilityId: string, date: string, startDayminute: number) {
  return (
    await api.tquery<{id: string}>(`facility/${facilityId}/meeting/tquery`, {
      columns: ["id"],
      filter: {
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "startDayminute", op: "=", val: startDayminute},
          {type: "column", column: "date", op: "=", val: date},
        ],
      },
      sort: [],
      pageSize: 10,
    })
  ).rows.map(({id}) => id);
}

const tab = meetingsListTab;

const rows = shownTableRows;

const meetingsFor = (page: Page, mode: "client" | "client_group" | "no_client_group") =>
  page.locator("main").getByText(new RegExp(`facility_user\\.meetings_lists\\.meetings_for\\.${mode}( |$)`));

meetingsWithGroupsLayer.describe((artifact) => {
  test(
    "client details list the meetings of the client, of the client's group, and those with no group",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, staffUserId, familyGroup, adultClientInfos, childClientInfos, todayMeeting} = artifact();
      const [adam, bea, , , eve] = adultClientInfos;
      const zoe = childClientInfos[0]!;
      const staffApi = await api.loggedInAs(STAFF);
      const dicts = await staffApi.dictionaries();
      const ok = dicts.attendanceStatus!.ok!;
      // A meeting of the family: two of its members, in the context of the group.
      await staffApi.createMeeting(facilityId, {
        typeDictId: dicts.meetingType!.other!,
        date: addDays(todayMeeting.date, 3),
        startDayminute: 840,
        durationMinutes: 60,
        statusDictId: dicts.meetingStatus!.planned!,
        isRemote: false,
        staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
        clients: [adam!, bea!].map(({id}) => ({userId: id, attendanceStatusDictId: ok, clientGroupId: familyGroup.id})),
      });
      await login(page, STAFF);

      await test.step("a member with a meeting of the group and one of her own", async () => {
        await openPage(page, `/${FACILITY.url}/clients/${bea!.id}`);
        // Her own meetings: the seeded one of today and the one of the family.
        await expect(tab(page, "planned")).toContainText(/meetings_lists\.planned — 2(\D|$)/i);
        await expect(rows(page)).toHaveCount(2);

        await meetingsFor(page, "client_group").click();
        await expect(rows(page)).toHaveCount(1);
        await expect(rows(page)).toContainText([
          new RegExp(`${adam!.name}[^]*${bea!.name}|${bea!.name}[^]*${adam!.name}`),
        ]);

        // The count of the meetings with no group is in the label.
        await expect(meetingsFor(page, "no_client_group")).toContainText("— 1");
        await meetingsFor(page, "no_client_group").click();
        await expect(rows(page)).toHaveCount(1);
        await expect(rows(page)).not.toContainText([adam!.name]);
      });

      await test.step("a member who was not at the meeting of the group", async () => {
        await openPage(page, `/${FACILITY.url}/clients/${zoe.id}`);
        // Her own meeting first: a click before the list is there may go unnoticed.
        await expect(rows(page)).toContainText([zoe.name]);
        await meetingsFor(page, "client_group").click();
        await expect(rows(page)).toContainText([adam!.name]);
        await expect(rows(page)).toHaveCount(1);
      });

      await test.step("a client in no group has no choice", async () => {
        await openPage(page, `/${FACILITY.url}/clients/${eve!.id}`);
        await expect(tab(page, "planned")).toBeVisible();
        await expect(meetingsFor(page, "client")).toHaveCount(0);
        await expect(meetingsFor(page, "client_group")).toHaveCount(0);
      });
    },
  );

  const modeLabel = (form: Locator, mode: "none" | "shared" | "shared_one_client" | "separate") =>
    form.getByText(new RegExp(`clientsGroupsMode\\.${mode}$`));
  const addAllButton = (form: Locator) => form.getByRole("button", {name: /sharedClientsGroupId\.addAll$/});

  test(
    "the form proposes the group of a single client; without a group on request",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, familyGroup, todayMeeting, adultClientInfos} = artifact();
      const bea = adultClientInfos[1]!;
      const staffApi = await api.loggedInAs(STAFF);
      const savedClients = () => meetingClients(staffApi, facilityId, todayMeeting.id);
      expect(await savedClients()).toMatchObject([{userId: bea.id, clientGroupId: null}]);
      await login(page, STAFF);
      const form = await openMeeting(page, todayMeeting);
      // No group so far, so nothing about groups in the view mode.
      await expect(form.getByText(familyGroup.notes)).toHaveCount(0);

      await test.step("editing proposes the only group of the client", async () => {
        await startEditing(page);
        await expectSectionShown(modeLabel(form, "shared_one_client"), true);
        await expectSectionShown(addAllButton(form), true);
        await expect(form.getByText(familyGroup.notes).first()).toBeVisible();
        // One client has no groups to tell apart.
        await expect(modeLabel(form, "separate")).toHaveCount(0);
        await saveEdit(page);
        expect(await savedClients()).toMatchObject([{userId: bea.id, clientGroupId: familyGroup.id}]);
        await reopenMeeting(page, todayMeeting);
        await expect(form.getByText(familyGroup.notes).first()).toBeVisible();
      });

      await test.step("the group is taken off", async () => {
        await startEditing(page);
        await expectSectionShown(addAllButton(form), true);
        await modeLabel(form, "none").click();
        await expect(addAllButton(form)).toHaveCount(0);
        await saveEdit(page);
        expect(await savedClients()).toMatchObject([{userId: bea.id, clientGroupId: null}]);
        await reopenMeeting(page, todayMeeting);
        await expect(form.getByText(bea.name)).toBeVisible();
        await expect(form.getByText(familyGroup.notes)).toHaveCount(0);
      });
    },
  );

  test("the other members of the group are added with one button", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, familyGroup, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    await login(page, STAFF);
    const form = await openMeeting(page, todayMeeting);
    await startEditing(page);
    await addAllButton(form).click();
    await expectSectionShown(form.getByText(/sharedClientsGroupId\.allAdded$/), true);
    await expect(addAllButton(form)).toHaveCount(0);
    // With more clients the mode is named differently, and each client may have a group of their own.
    await expectSectionShown(modeLabel(form, "shared"), true);
    await expectSectionShown(modeLabel(form, "separate"), true);
    await saveEdit(page);
    const clients = await meetingClients(staffApi, facilityId, todayMeeting.id);
    expect(clients.map(({userId}) => userId).sort()).toEqual([...familyGroup.memberUserIds].sort());
    expect(new Set(clients.map(({clientGroupId}) => clientGroupId))).toEqual(new Set([familyGroup.id]));
  });

  test(
    "clients with no common group get a group each; with a common one, they can share it",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, pairGroup, familyGroup, mixedGroup, futureMeeting, adultClientInfos, childClientInfos} =
        artifact();
      const [adam, , carl] = adultClientInfos;
      const yara = childClientInfos[2]!;
      const staffApi = await api.loggedInAs(STAFF);
      const [adamFirst, adamOther] = await groupsOfClient(staffApi, facilityId, adam!.id, [familyGroup, mixedGroup]);
      const savedClients = () => meetingClients(staffApi, facilityId, futureMeeting.id);
      await login(page, STAFF);
      const form = await openMeeting(page, futureMeeting);

      await test.step("a group per client, chosen among the groups of each", async () => {
        await startEditing(page);
        await form.locator("title=forms.meeting.add_attendant.clients").click();
        await chooseInFormSelect(page, "clients.1.userId", new RegExp(adam!.name));
        // No group has both, so the form turns to a group per client, proposing the first of each.
        await expect(formSelect(form, "clients.0.clientGroupId")).toContainText(pairGroup.notes);
        await expect(formSelect(form, "clients.1.clientGroupId")).toContainText(adamFirst!.notes);
        // A common group cannot be chosen.
        await modeLabel(form, "shared").click({force: true});
        await expectSectionShown(formSelect(form, "clients.1.clientGroupId"), true);
        await formSelect(form, "clients.1.clientGroupId").click();
        await expect(page.getByRole("option")).toHaveText([new RegExp(adamFirst!.notes), new RegExp(adamOther!.notes)]);
        await page.getByRole("option", {name: adamOther!.notes}).click();
        await saveEdit(page);
        expect(await savedClients()).toMatchObject([
          {userId: carl!.id, clientGroupId: pairGroup.id},
          {userId: adam!.id, clientGroupId: adamOther!.id},
        ]);
      });

      await test.step("two members of one group share it", async () => {
        await reopenMeeting(page, futureMeeting);
        await startEditing(page);
        await chooseInFormSelect(page, "clients.1.userId", new RegExp(yara.name));
        // The form goes back to a group per client if the mode is changed before the new client's
        // group is there.
        await expect(form.locator('button[aria-pressed="true"]')).toHaveCount(2);
        await modeLabel(form, "shared").click();
        await expectSectionShown(form.getByText(/sharedClientsGroupId\.allAdded$/), true);
        await saveEdit(page);
        expect(await savedClients()).toMatchObject([
          {userId: carl!.id, clientGroupId: pairGroup.id},
          {userId: yara.id, clientGroupId: pairGroup.id},
        ]);
      });
    },
  );

  test(
    "the create form offers the groups of a client, and narrows them down with more clients",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, familyGroup, mixedGroup, todayMeeting, adultClientInfos, childClientInfos} = artifact();
      const adam = adultClientInfos[0]!;
      // A child of the mixed group: with Adam only in that one.
      const child = childClientInfos.find(({id}) => mixedGroup.memberUserIds.includes(id))!;
      const staffApi = await api.loggedInAs(STAFF);
      const adamGroups = await groupsOfClient(staffApi, facilityId, adam.id, [familyGroup, mixedGroup]);
      await login(page, STAFF);
      await openCalendar(page, FACILITY.url, {mode: "day", date: todayMeeting.date, resources: [STAFF.name]});
      // The seeded meeting is 10:00–11:00, the slot starts at 11:15.
      await clickSlotBelowMeeting(page, meetingBlocks(page, todayMeeting.id), {
        durationMinutes: 60,
        minutesAfterEnd: 15,
      });
      await expect(page.getByRole("heading", {name: "forms.meeting_create.form_name"})).toBeVisible();
      const form = page.locator("#meeting_create");
      await chooseInFormSelect(page, "typeDictId", /dictionary\.meetingType\.other/);
      // No client, no groups.
      await expectSectionShown(modeLabel(form, "none"), false);

      await test.step("a client in two groups: one is proposed, the other can be chosen", async () => {
        await chooseInFormSelect(page, "clients.0.userId", new RegExp(adam.name));
        await expectSectionShown(modeLabel(form, "shared_one_client"), true);
        const sharedGroup = formSelect(form, "sharedClientsGroupId");
        await expectSectionShown(sharedGroup, true);
        await expect(sharedGroup).toContainText(adamGroups[0]!.notes);
        await sharedGroup.click();
        await expect(page.getByRole("option")).toHaveText(adamGroups.map(({notes}) => new RegExp(notes)));
        await page.getByRole("option", {name: mixedGroup.notes}).click();
        await expect(sharedGroup).toContainText(mixedGroup.notes);
      });

      await test.step("a second client leaves only the group the two share", async () => {
        await form.locator("title=forms.meeting.add_attendant.clients").click();
        await chooseInFormSelect(page, "clients.1.userId", new RegExp(child.name));
        await expectSectionShown(modeLabel(form, "shared"), true);
        await expect(formSelect(form, "sharedClientsGroupId")).toHaveCount(0);
        // The third member of the group is not in the meeting.
        await expectSectionShown(addAllButton(form), true);
      });

      await form.getByRole("button", {name: "forms.meeting_create.submit"}).click();
      await expectFormSuccess(page, "meeting_create");
      const [createdId, ...others] = await meetingIdsAt(staffApi, facilityId, todayMeeting.date, 675);
      expect(others).toEqual([]);
      expect(await meetingClients(staffApi, facilityId, createdId!)).toMatchObject([
        {userId: adam.id, clientGroupId: mixedGroup.id},
        {userId: child.id, clientGroupId: mixedGroup.id},
      ]);
    },
  );

  test("with a group per client, the group of one client is switched off and on", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, pairGroup, familyGroup, mixedGroup, futureMeeting, adultClientInfos} = artifact();
    const [adam, , carl] = adultClientInfos;
    const staffApi = await api.loggedInAs(STAFF);
    const [adamFirst] = await groupsOfClient(staffApi, facilityId, adam!.id, [familyGroup, mixedGroup]);
    const savedClients = () => meetingClients(staffApi, facilityId, futureMeeting.id);
    await login(page, STAFF);
    const form = await openMeeting(page, futureMeeting);
    /** The buttons of the clients that switch the group of each on and off. */
    const toggles = (state: "on" | "off") => form.locator(`button[aria-pressed="${state === "on"}"]`);

    await test.step("switched off for the first client", async () => {
      await startEditing(page);
      await form.locator("title=forms.meeting.add_attendant.clients").click();
      await chooseInFormSelect(page, "clients.1.userId", new RegExp(adam!.name));
      await expect(formSelect(form, "clients.1.clientGroupId")).toContainText(adamFirst!.notes);
      await expect(toggles("on")).toHaveCount(2);
      await toggles("on").first().click();
      await expect(toggles("on")).toHaveCount(1);
      await expect(toggles("off")).toHaveCount(1);
      await saveEdit(page);
      expect(await savedClients()).toMatchObject([
        {userId: carl!.id, clientGroupId: null},
        {userId: adam!.id, clientGroupId: adamFirst!.id},
      ]);
    });

    await test.step("the form opens again with a group per client; switched on, it is the client's group", async () => {
      await reopenMeeting(page, futureMeeting);
      await startEditing(page);
      await expect(toggles("off")).toHaveCount(1);
      await toggles("off").click();
      await expect(toggles("on")).toHaveCount(2);
      await saveEdit(page);
      expect(await savedClients()).toMatchObject([
        {userId: carl!.id, clientGroupId: pairGroup.id},
        {userId: adam!.id, clientGroupId: adamFirst!.id},
      ]);
    });
  });
});
