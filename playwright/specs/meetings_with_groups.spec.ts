import {meetingClients} from "../helpers/queries.ts";
import {createdId, expectValidationErrors} from "../lib/responses.ts";
import {STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {meetingsWithGroupsLayer} from "../lib/layers/meetings.ts";
import {expect, readOnlyTest, test} from "../lib/test.ts";

meetingsWithGroupsLayer.describe((artifact) => {
  // Cross-feature: meetings + client groups. A meeting with a client attendant tagged to a
  // pre-existing client group references both the group and the client.
  test("meeting with attendant linked to a client group references the group", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, familyGroup, todayMeeting} = artifact();
    const groupId = familyGroup.id;
    const groupClientUserIds = familyGroup.memberUserIds;
    const dicts = await staffApi.dictionaries();
    const res = await staffApi.createMeeting(facilityId, {
      typeDictId: dicts.meetingType!.other!,
      date: todayMeeting.date,
      startDayminute: 840,
      durationMinutes: 60,
      statusDictId: dicts.meetingStatus!.planned!,
      isRemote: false,
      staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
      clients: [
        {
          userId: groupClientUserIds[0]!,
          attendanceStatusDictId: dicts.attendanceStatus!.ok!,
          clientGroupId: groupId,
        },
      ],
    });
    const id = await createdId(res);
    const clients = await meetingClients(staffApi, facilityId, id);
    const groupedAttendant = clients.find((a) => a.userId === groupClientUserIds[0]);
    expect(groupedAttendant?.clientGroupId).toBe(groupId);
  });

  readOnlyTest("creating a meeting tagging a non-group-member with a clientGroupId is rejected", async ({api}) => {
    // MeetingClientGroupRule: if clientGroupId is set, the user MUST be in that group. Try to
    // tag Eve Kowalski (not a member of the pair group) with the pair group's id and expect 400.
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, pairGroup, adultClientInfos, todayMeeting} = artifact();
    const eve = adultClientInfos.find((i) => i.firstName === "Eve")!;
    const dicts = await staffApi.dictionaries();
    const res = await staffApi.createMeeting(
      facilityId,
      {
        typeDictId: dicts.meetingType!.other!,
        date: todayMeeting.date,
        startDayminute: 660,
        durationMinutes: 30,
        statusDictId: dicts.meetingStatus!.planned!,
        isRemote: false,
        staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
        clients: [{userId: eve.id, attendanceStatusDictId: dicts.attendanceStatus!.ok!, clientGroupId: pairGroup.id}],
      },
      {allowFailure: true},
    );
    await expectValidationErrors(res, [{field: "clients.0", code: "validation.custom.group_client_exists"}]);
  });

  test("PATCHing the meeting attendant with clientGroupId=null preserves the client but clears the link", async ({
    api,
  }) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, familyGroup, todayMeeting} = artifact();
    const groupClientUserId = familyGroup.memberUserIds[0]!;
    const dicts = await staffApi.dictionaries();
    const ok = dicts.attendanceStatus!.ok!;
    // First attach with group.
    await staffApi.patchMeeting(facilityId, todayMeeting.id, {
      staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
      clients: [{userId: groupClientUserId, attendanceStatusDictId: ok, clientGroupId: familyGroup.id}],
    });
    // Then clear the group reference (clientGroupId=null) while keeping the same client.
    await staffApi.patchMeeting(facilityId, todayMeeting.id, {
      staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
      clients: [{userId: groupClientUserId, attendanceStatusDictId: ok, clientGroupId: null}],
    });
    const clients = await meetingClients(staffApi, facilityId, todayMeeting.id);
    const attendant = clients.find((c) => c.userId === groupClientUserId);
    expect(attendant?.clientGroupId).toBeNull();
  });

  test("staff_admin assigns a group to one client's existing meetings via assign-to-attendants", async ({api}) => {
    // The non-developer branch of assignToAttendants requires `replaceAll=false` and a concrete
    // clientUserId, and sets the given group on every meeting where that client is an attendant.
    const staffAdminApi = await api.loggedInAs(STAFF_ADMIN);
    const {facilityId, staffUserId, todayMeeting, pairGroup} = artifact();
    const dicts = await staffAdminApi.dictionaries();
    const ok = dicts.attendanceStatus!.ok!;
    // Seed an extra meeting whose only client is Carl (the pair group's adult), then call
    // assign-to-attendants — should attach pairGroup.id to that attendant row.
    const carlUserId = pairGroup.memberUserIds[0]!;
    const createRes = await staffAdminApi.createMeeting(facilityId, {
      typeDictId: dicts.meetingType!.other!,
      date: todayMeeting.date,
      startDayminute: 780,
      durationMinutes: 30,
      statusDictId: dicts.meetingStatus!.planned!,
      isRemote: false,
      staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
      clients: [{userId: carlUserId, attendanceStatusDictId: ok}],
    });
    const newMeetingId = await createdId(createRes);

    await staffAdminApi.post(`facility/${facilityId}/client-group/assign-to-attendants`, {
      clientUserId: carlUserId,
      clientGroupId: pairGroup.id,
      replaceAll: false,
    });

    const clients = await meetingClients(staffAdminApi, facilityId, newMeetingId);
    const attendant = clients.find((c) => c.userId === carlUserId);
    expect(attendant?.clientGroupId).toBe(pairGroup.id);
  });

  test("deleting a client group nulls every attendant.client_group_id that referenced it", async ({api}) => {
    // First create a meeting with a group-tagged attendant, then delete the group; the attendant
    // row must remain (client still on the meeting) but its clientGroupId is reset to null.
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, todayMeeting, pairGroup} = artifact();
    const dicts = await staffApi.dictionaries();
    const ok = dicts.attendanceStatus!.ok!;
    const carlUserId = pairGroup.memberUserIds[0]!;
    const createRes = await staffApi.createMeeting(facilityId, {
      typeDictId: dicts.meetingType!.other!,
      date: todayMeeting.date,
      startDayminute: 810,
      durationMinutes: 30,
      statusDictId: dicts.meetingStatus!.planned!,
      isRemote: false,
      staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
      clients: [{userId: carlUserId, attendanceStatusDictId: ok, clientGroupId: pairGroup.id}],
    });
    const meetingId = await createdId(createRes);

    await staffApi.delete(`facility/${facilityId}/client-group/${pairGroup.id}`);

    const clients = await meetingClients(staffApi, facilityId, meetingId);
    const attendant = clients.find((c) => c.userId === carlUserId);
    expect(attendant).toBeDefined();
    expect(attendant?.clientGroupId).toBeNull();
  });

  test("PATCH client-group/{id} can rename and replace its member list", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, mixedGroup, childClientInfos} = artifact();
    // Replace members with just the Wisniewski children (drop Adam).
    const wisniewski = childClientInfos.filter((c) => c.surname === "Wisniewski");
    expect(wisniewski).toHaveLength(2);
    await staffApi.patch(`facility/${facilityId}/client-group/${mixedGroup.id}`, {
      notes: "children only",
      clients: wisniewski.map((c) => ({userId: c.id, role: null})),
    });
    const body = await staffApi.list<{notes: string | null; clients: readonly {userId: string}[]}>(
      `facility/${facilityId}/client-group`,
      mixedGroup.id,
    );
    expect(body[0]!.notes).toBe("children only");
    expect(body[0]!.clients.map((c) => c.userId).sort()).toEqual(wisniewski.map((c) => c.id).sort());
  });
});
