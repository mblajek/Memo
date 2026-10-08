import {seededDays} from "../helpers/meetings.ts";
import {ADMIN, BARE_MEMBER, STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {
  cloneMeeting,
  createMeetingResource,
  meetingClientIds,
  meetingClients,
  meetingConflicts,
  type ConflictsRequest,
} from "../helpers/queries.ts";
import {createdId, expectValidationError, expectValidationErrors, responseData} from "../lib/responses.ts";
import {expect, MemoAPI, readOnlyTest, test} from "../lib/test.ts";

interface ListedMeeting {
  readonly id: string;
  readonly date: string;
  readonly fromMeetingId: string | null;
  readonly resources: readonly {readonly resourceDictId: string}[];
}

async function listMeetings(api: MemoAPI, facilityId: string, ids: readonly string[]) {
  return api.list<ListedMeeting>(`facility/${facilityId}/meeting`, ids);
}

/** The ids of the meetings matching the filter, in the meetings tquery, sorted. */
async function queryMeetingIds(api: MemoAPI, facilityId: string, filter: unknown) {
  const {rows} = await api.tquery<{id: string}>(`facility/${facilityId}/meeting/tquery`, {columns: ["id"], filter});
  return rows.map(({id}) => id).toSorted();
}

meetingsLayer.describe((artifact) => {
  const seededDay = seededDays(artifact);

  readOnlyTest("staff list meetings returns the seeded past/today/future", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, pastMeeting, todayMeeting, futureMeeting} = artifact();
    const ids = [pastMeeting.id, todayMeeting.id, futureMeeting.id];
    const body = await staffApi.list<{id: string; date: string}>(`facility/${facilityId}/meeting`, ids);
    expect(body).toHaveLength(3);
    const map = new Map(body.map((m) => [m.id, m.date]));
    expect(map.get(pastMeeting.id)).toBe(pastMeeting.date);
    expect(map.get(todayMeeting.id)).toBe(todayMeeting.date);
    expect(map.get(futureMeeting.id)).toBe(futureMeeting.date);
  });

  readOnlyTest("meeting list returns configured staff and clients", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, adultClientInfos, todayMeeting} = artifact();
    const body = await staffApi.list<{
      id: string;
      staff: readonly {userId: string}[];
      clients: readonly {userId: string}[];
    }>(`facility/${facilityId}/meeting`, todayMeeting.id);
    const meeting = body[0]!;
    expect(meeting.staff.map((a) => a.userId)).toEqual([staffUserId]);
    expect(meeting.clients.map((a) => a.userId)).toEqual([adultClientInfos[1]!.id]);
  });

  readOnlyTest("multi-attendant group meeting has 2 staff + 3 clients, 90 min", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, groupMeeting} = artifact();
    const body = await staffApi.list<{
      staff: readonly {userId: string}[];
      clients: readonly {userId: string}[];
      durationMinutes: number;
    }>(`facility/${facilityId}/meeting`, groupMeeting.id);
    const m = body[0]!;
    expect(m.staff).toHaveLength(2);
    expect(m.clients).toHaveLength(3);
    expect(m.durationMinutes).toBe(90);
  });

  readOnlyTest("custom meeting types are returned by /system/dictionary/list", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {customTypeIds} = artifact();
    const body =
      await staffApi.getData<readonly {name: string; positions: readonly {id: string; name: string}[]}[]>(
        "system/dictionary/list",
      );
    const meetingTypeDict = body.find((d) => d.name === "meetingType");
    expect(meetingTypeDict).toBeDefined();
    const positionIds = meetingTypeDict!.positions.map((p) => p.id);
    expect(positionIds).toContain(customTypeIds.therapy);
    expect(positionIds).toContain(customTypeIds.consult);
  });

  readOnlyTest("meetings of the custom types have the category of their type", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, groupMeeting, shortMeeting} = artifact();
    const {meetingCategory} = await staffApi.dictionaries();
    const meetings = await staffApi.list<{id: string; categoryDictId: string}>(`facility/${facilityId}/meeting`, [
      groupMeeting.id,
      shortMeeting.id,
    ]);
    expect(Object.fromEntries(meetings.map((m) => [m.id, m.categoryDictId]))).toEqual({
      [groupMeeting.id]: meetingCategory!.other,
      [shortMeeting.id]: meetingCategory!.system,
    });
  });

  test("staff creates a one-off meeting via API; appears in list", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, adultClientInfos} = artifact();
    const dicts = await staffApi.dictionaries();
    const res = await staffApi.createMeeting(facilityId, {
      typeDictId: dicts.meetingType!.other!,
      date: artifact().todayMeeting.date,
      startDayminute: 720,
      durationMinutes: 30,
      statusDictId: dicts.meetingStatus!.planned!,
      isRemote: false,
      staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
      clients: [{userId: adultClientInfos[0]!.id, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
    });
    const id = await createdId(res);
    expect(id).toBeTruthy();
    const data = await staffApi.list<{id: string}>(`facility/${facilityId}/meeting`, id);
    expect(data[0]!.id).toBe(id);
  });

  test("staff deletes a meeting; list no longer returns it", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, futureMeeting} = artifact();
    await staffApi.delete(`facility/${facilityId}/meeting/${futureMeeting.id}`);
    expect(await listMeetings(staffApi, facilityId, [futureMeeting.id])).toEqual([]);
  });

  test("staff edits meeting time; the new time is persisted", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, todayMeeting} = artifact();
    const newStart = 900;
    await staffApi.patch(`facility/${facilityId}/meeting/${todayMeeting.id}`, {startDayminute: newStart});
    const body = await staffApi.list<{id: string; startDayminute: number}>(
      `facility/${facilityId}/meeting`,
      todayMeeting.id,
    );
    expect(body[0]!.startDayminute).toBe(newStart);
  });

  readOnlyTest("creating a meeting with zero duration is rejected", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, adultClientInfos} = artifact();
    const dicts = await staffApi.dictionaries();
    const res = await staffApi.createMeeting(
      facilityId,
      {
        typeDictId: dicts.meetingType!.other!,
        date: artifact().todayMeeting.date,
        startDayminute: 600,
        durationMinutes: 0,
        statusDictId: dicts.meetingStatus!.planned!,
        isRemote: false,
        staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
        clients: [{userId: adultClientInfos[0]!.id, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
      },
      {allowFailure: true},
    );
    await expectValidationErrors(res, [{field: "durationMinutes", code: "validation.min.numeric"}]);
  });

  readOnlyTest("creating a meeting with an out-of-range startDayminute is rejected", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId, adultClientInfos} = artifact();
    const dicts = await staffApi.dictionaries();
    const res = await staffApi.createMeeting(
      facilityId,
      {
        typeDictId: dicts.meetingType!.other!,
        date: artifact().todayMeeting.date,
        startDayminute: 24 * 60, // one past the max
        durationMinutes: 30,
        statusDictId: dicts.meetingStatus!.planned!,
        isRemote: false,
        staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
        clients: [{userId: adultClientInfos[0]!.id, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
      },
      {allowFailure: true},
    );
    await expectValidationErrors(res, [{field: "startDayminute", code: "validation.max.numeric"}]);
  });

  test("staff cancels a meeting via status patch", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, futureMeeting} = artifact();
    const dicts = await staffApi.dictionaries();
    await staffApi.patch(`facility/${facilityId}/meeting/${futureMeeting.id}`, {
      statusDictId: dicts.meetingStatus!.cancelled!,
    });
    const body = await staffApi.list<{id: string; statusDictId: string}>(
      `facility/${facilityId}/meeting`,
      futureMeeting.id,
    );
    expect(body[0]!.statusDictId).toBe(dicts.meetingStatus!.cancelled);
  });

  readOnlyTest("meeting-attendants tquery returns rows for seeded meetings", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const body = await staffApi.tquery(`facility/${facilityId}/meeting/attendant/tquery`, {
      columns: ["id"],
    });
    // The five seeded meetings have seven clients and six staff members among them.
    expect(body.total).toBe(13);
  });

  readOnlyTest("meeting-client tquery returns a row per client of each seeded meeting", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const body = await staffApi.tquery(`facility/${facilityId}/meeting/client/tquery`, {
      columns: ["id"],
    });
    // Past + today + future singletons (3) + group meeting (3 clients) + short meeting (1)
    // = 7 client-attendant rows from this layer's seed.
    expect(body.total).toBe(7);
  });

  test("staff clones today's meeting to two future dates; clones link as a series", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, todayMeeting} = artifact();
    const dates = [seededDay(14), seededDay(21)];
    const cloneIds = await cloneMeeting(staffApi, facilityId, todayMeeting.id, dates);
    expect(cloneIds).toHaveLength(2);
    // The original becomes the series head: every member (original + clones) shares
    // `fromMeetingId === todayMeeting.id` and the interval set on the request.
    const data = await staffApi.list<{id: string; date: string; fromMeetingId: string | null; interval: string | null}>(
      `facility/${facilityId}/meeting`,
      [todayMeeting.id, ...cloneIds],
    );
    for (const m of data) {
      expect(m.fromMeetingId, `${m.id} not linked to series`).toBe(todayMeeting.id);
      expect(m.interval).toBe("7d");
    }
    const cloneDates = data
      .filter((m) => cloneIds.includes(m.id))
      .map((m) => m.date)
      .sort();
    expect(cloneDates).toEqual([...dates].sort());
  });

  test("series delete 'all' removes the original + every clone", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, futureMeeting} = artifact();
    const dates = [seededDay(30), seededDay(37), seededDay(44)];
    const cloneIds = await cloneMeeting(staffApi, facilityId, futureMeeting.id, dates);
    const allIds = [futureMeeting.id, ...cloneIds];

    const delRes = await staffApi.delete(`facility/${facilityId}/meeting/${futureMeeting.id}`, {series: "all"});
    expect((await responseData<{count: number}>(delRes)).count).toBe(allIds.length);
    const remain = await staffApi.list<{id: string}>(`facility/${facilityId}/meeting`, allIds);
    expect(remain).toHaveLength(0);
  });

  test("series delete 'from_next' removes later clones but keeps the anchor", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, futureMeeting} = artifact();
    const dates = [seededDay(60), seededDay(67), seededDay(74)];
    const cloneIds = await cloneMeeting(staffApi, facilityId, futureMeeting.id, dates);
    // Take the middle clone as the anchor — 'from_next' should remove only the latest clone
    // (date dayOffset 74), keeping anchor + earlier clone + original.
    const anchorId = cloneIds[1]!;
    const delRes = await staffApi.delete(`facility/${facilityId}/meeting/${anchorId}`, {series: "from_next"});
    expect((await responseData<{count: number}>(delRes)).count).toBe(1);
    const allIds = [futureMeeting.id, ...cloneIds];
    const remain = (await staffApi.list<{id: string}>(`facility/${facilityId}/meeting`, allIds)).map((m) => m.id);
    expect(remain).toContain(anchorId);
    expect(remain).toContain(futureMeeting.id);
    expect(remain).not.toContain(cloneIds[2]);
  });

  test("editing typeDictId of a series member breaks its link (fromMeetingId/interval cleared)", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, todayMeeting, customTypeIds} = artifact();
    const dates = [seededDay(14)];
    const cloneIds = await cloneMeeting(staffApi, facilityId, todayMeeting.id, dates);
    const cloneId = cloneIds[0]!;

    await staffApi.patch(`facility/${facilityId}/meeting/${cloneId}`, {typeDictId: customTypeIds.therapy});

    const body = await staffApi.list<{
      id: string;
      fromMeetingId: string | null;
      interval: string | null;
      typeDictId: string;
    }>(`facility/${facilityId}/meeting`, cloneId);
    expect(body[0]!.fromMeetingId).toBeNull();
    expect(body[0]!.interval).toBeNull();
    expect(body[0]!.typeDictId).toBe(customTypeIds.therapy);
  });

  test("staff marks a client absent on a past meeting via PATCH attendant.attendanceStatusDictId", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, pastMeeting, adultClientInfos, staffUserId} = artifact();
    const dicts = await staffApi.dictionaries();
    const ok = dicts.attendanceStatus!.ok!;
    const cancelled = dicts.attendanceStatus!.cancelled!;
    const clientUserId = adultClientInfos[0]!.id;
    // PATCH sends the full final attendant list — diff resolves to update of the client row only.
    await staffApi.patchMeeting(facilityId, pastMeeting.id, {
      staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
      clients: [{userId: clientUserId, attendanceStatusDictId: cancelled}],
    });
    expect(await meetingClients(staffApi, facilityId, pastMeeting.id)).toMatchObject([
      {userId: clientUserId, attendanceStatusDictId: cancelled},
    ]);
  });

  test("switching the client on a meeting drops the old attendant and adds the new one", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, todayMeeting, adultClientInfos, staffUserId} = artifact();
    const dicts = await staffApi.dictionaries();
    const ok = dicts.attendanceStatus!.ok!;
    const newClient = adultClientInfos[2]!.id;
    await staffApi.patchMeeting(facilityId, todayMeeting.id, {
      staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
      clients: [{userId: newClient, attendanceStatusDictId: ok}],
    });
    expect(await meetingClientIds(staffApi, facilityId, todayMeeting.id)).toEqual([newClient]);
  });

  readOnlyTest("conflicts endpoint flags the seeded group meeting when probing the same slot", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, groupMeeting, staffUserId, staffAdminUserId, adultClientInfos, childClientInfos} = artifact();
    // The group meeting runs 720..810 (12:00–13:30); the probe 745..775 overlaps it.
    const [sample] = await meetingConflicts(staffApi, facilityId, {
      samples: [{date: groupMeeting.date, startDayminute: 745, durationMinutes: 30}],
      staff: true,
      clients: true,
    });
    const ofGroupMeeting = (userIds: readonly string[]) => userIds.map((id) => ({id, meetingIds: [groupMeeting.id]}));
    expect(sample).toEqual({
      staff: ofGroupMeeting([staffUserId, staffAdminUserId]),
      clients: ofGroupMeeting([adultClientInfos[3]!.id, childClientInfos[0]!.id, childClientInfos[1]!.id]),
    });
  });

  readOnlyTest("conflicts endpoint excludes the seeded meeting when ignoreMeetingIds names it", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, groupMeeting} = artifact();
    const [sample] = await meetingConflicts(staffApi, facilityId, {
      samples: [{date: groupMeeting.date, startDayminute: 745, durationMinutes: 30}],
      staff: true,
      clients: true,
      ignoreMeetingIds: [groupMeeting.id],
    });
    expect(sample).toEqual({staff: [], clients: []});
  });

  readOnlyTest("conflicts endpoint reports nothing for a free slot in the far future", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const [sample] = await meetingConflicts(staffApi, facilityId, {
      samples: [{date: seededDay(365), startDayminute: 0, durationMinutes: 30}],
      staff: true,
      clients: true,
      resources: true,
    });
    expect(sample).toEqual({staff: [], clients: [], resources: []});
  });

  test("staff creates a work-time meeting (meetingType.work_time) with no clients", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId} = artifact();
    const dicts = await staffApi.dictionaries();
    const ok = dicts.attendanceStatus!.ok!;
    const res = await staffApi.createMeeting(facilityId, {
      typeDictId: dicts.meetingType!.work_time!,
      date: seededDay(3),
      startDayminute: 480,
      durationMinutes: 480,
      statusDictId: dicts.meetingStatus!.planned!,
      isRemote: false,
      staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
      clients: [],
    });
    const id = await createdId(res);
    const data = await staffApi.list<{categoryDictId: string; clients: unknown[]}>(
      `facility/${facilityId}/meeting`,
      id,
    );
    expect(data[0]!.categoryDictId).toBe(dicts.meetingCategory!.system);
    expect(data[0]!.clients).toHaveLength(0);
  });

  readOnlyTest("conflicts endpoint ignores the meetings of the system category", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, shortMeeting} = artifact();
    // The slot of the short meeting, which is of a type of the system category.
    const [sample] = await meetingConflicts(staffApi, facilityId, {
      samples: [{date: shortMeeting.date, startDayminute: 540, durationMinutes: 30}],
      staff: true,
      clients: true,
    });
    expect(sample).toEqual({staff: [], clients: []});
  });

  test("series delete 'from_this' removes the anchor and the later meetings only", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, futureMeeting} = artifact();
    const cloneIds = await cloneMeeting(staffApi, facilityId, futureMeeting.id, [
      seededDay(90),
      seededDay(97),
      seededDay(104),
    ]);
    const allIds = [futureMeeting.id, ...cloneIds];
    const anchorId = cloneIds[1]!;
    const delRes = await staffApi.delete(`facility/${facilityId}/meeting/${anchorId}`, {series: "from_this"});
    expect((await responseData<{count: number}>(delRes)).count).toBe(2);
    const remaining = await listMeetings(staffApi, facilityId, allIds);
    expect(remaining.map((m) => m.id).toSorted()).toEqual([futureMeeting.id, cloneIds[0]!].toSorted());
    // The rest is still a series.
    for (const m of remaining) {
      expect(m.fromMeetingId).toBe(futureMeeting.id);
    }
  });

  test("series delete modes are refused on a meeting outside any series; otherIds deletes more", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, todayMeeting, futureMeeting, pastMeeting} = artifact();
    const path = `facility/${facilityId}/meeting/${todayMeeting.id}`;
    for (const series of ["from_this", "from_next", "all", "bogus"]) {
      const res = await staffApi.delete(path, {series}, {allowFailure: true});
      await expectValidationError(res, {field: "series", code: "validation.in"});
    }
    expect(await listMeetings(staffApi, facilityId, [todayMeeting.id])).toHaveLength(1);
    const delRes = await staffApi.delete(path, {series: "one", otherIds: [futureMeeting.id]});
    expect((await responseData<{count: number}>(delRes)).count).toBe(2);
    const remaining = await listMeetings(staffApi, facilityId, [todayMeeting.id, futureMeeting.id, pastMeeting.id]);
    expect(remaining.map((m) => m.id)).toEqual([pastMeeting.id]);
  });

  readOnlyTest("meetings tquery filters by date range, type and staff", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffAdminUserId, customTypeIds} = artifact();
    const {pastMeeting, todayMeeting, futureMeeting, groupMeeting, shortMeeting} = artifact();
    const query = (filter: unknown) => queryMeetingIds(staffApi, facilityId, filter);
    const ids = (...meetings: readonly {id: string}[]) => meetings.map((m) => m.id).toSorted();
    expect(await query(undefined)).toEqual(ids(pastMeeting, todayMeeting, futureMeeting, groupMeeting, shortMeeting));
    const from = {type: "column", column: "date", op: ">=", val: seededDay(0)};
    const to = {type: "column", column: "date", op: "<=", val: seededDay(1)};
    expect(await query({type: "op", op: "&", val: [from, to]})).toEqual(ids(todayMeeting, groupMeeting));
    expect(await query({type: "column", column: "date", op: "<", val: seededDay(0)})).toEqual(ids(pastMeeting));
    expect(await query({type: "column", column: "typeDictId", op: "=", val: customTypeIds.therapy})).toEqual(
      ids(groupMeeting),
    );
    expect(
      await query({
        type: "column",
        column: "typeDictId",
        op: "in",
        val: [customTypeIds.therapy, customTypeIds.consult],
      }),
    ).toEqual(ids(groupMeeting, shortMeeting));
    // Only the group meeting has the second staff member.
    const staffFilter = {type: "column", column: "staff.*.userId", op: "has", val: staffAdminUserId};
    expect(await query(staffFilter)).toEqual(ids(groupMeeting));
    expect(await query({...staffFilter, inv: true})).toEqual(
      ids(pastMeeting, todayMeeting, futureMeeting, shortMeeting),
    );
    expect(await query({type: "column", column: "clients.count", op: ">", val: 1})).toEqual(ids(groupMeeting));
  });

  test("resources are attached to a meeting on create and replaced on patch", async ({api}) => {
    const {facilityId, staffUserId, todayMeeting} = artifact();
    const adminApi = await api.loggedInAs(STAFF_ADMIN);
    const roomId = await createMeetingResource(adminApi, facilityId, "E2E Room");
    const projectorId = await createMeetingResource(adminApi, facilityId, "E2E Projector");
    const staffApi = await api.loggedInAs(STAFF);
    const dicts = await staffApi.dictionaries();
    const meeting = {
      typeDictId: dicts.meetingType!.other!,
      date: seededDay(3),
      startDayminute: 600,
      durationMinutes: 60,
      statusDictId: dicts.meetingStatus!.planned!,
      staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
    };
    const id = await createdId(
      await staffApi.createMeeting(facilityId, {
        ...meeting,
        resources: [{resourceDictId: roomId}, {resourceDictId: projectorId}],
      }),
    );
    const resourcesOf = async () =>
      (await listMeetings(staffApi, facilityId, [id]))[0]!.resources.map((r) => r.resourceDictId).toSorted();
    expect(await resourcesOf()).toEqual([roomId, projectorId].toSorted());
    const withRoom = {type: "column", column: "resources.*.dictId", op: "has", val: roomId};
    expect(await queryMeetingIds(staffApi, facilityId, withRoom)).toEqual([id]);

    await staffApi.patchMeeting(facilityId, id, {resources: [{resourceDictId: projectorId}]});
    expect(await resourcesOf()).toEqual([projectorId]);
    expect(await queryMeetingIds(staffApi, facilityId, withRoom)).toEqual([]);
    // A patch without resources leaves them alone.
    await staffApi.patchMeeting(facilityId, id, {notes: "still with the projector"});
    expect(await resourcesOf()).toEqual([projectorId]);
    await staffApi.patchMeeting(facilityId, id, {resources: []});
    expect(await resourcesOf()).toEqual([]);

    await test.step("the same resource twice, or something that is not a resource, is rejected", async () => {
      const twice = await staffApi.createMeeting(
        facilityId,
        {...meeting, resources: [{resourceDictId: roomId}, {resourceDictId: roomId}]},
        {allowFailure: true},
      );
      expect(twice.status(), await twice.text()).toBe(400);
      const notResource = await staffApi.patchMeeting(
        facilityId,
        todayMeeting.id,
        {resources: [{resourceDictId: dicts.meetingType!.other!}]},
        {allowFailure: true},
      );
      expect(notResource.status(), await notResource.text()).toBe(400);
      expect((await listMeetings(staffApi, facilityId, [todayMeeting.id]))[0]!.resources).toEqual([]);
    });
  });

  test("two overlapping meetings on the same resource are flagged as a resource conflict", async ({api}) => {
    const {facilityId, staffUserId, staffAdminUserId, customTypeIds} = artifact();
    const adminApi = await api.loggedInAs(STAFF_ADMIN);
    const roomId = await createMeetingResource(adminApi, facilityId, "E2E Room");
    const otherRoomId = await createMeetingResource(adminApi, facilityId, "E2E Other Room");
    const staffApi = await api.loggedInAs(STAFF);
    const dicts = await staffApi.dictionaries();
    const date = seededDay(4);
    const create = async (startDayminute: number, staffId: string, resourceDictId: string) =>
      createdId(
        await staffApi.createMeeting(facilityId, {
          typeDictId: customTypeIds.therapy,
          date,
          startDayminute,
          durationMinutes: 60,
          statusDictId: dicts.meetingStatus!.planned!,
          staff: [{userId: staffId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
          resources: [{resourceDictId}],
        }),
      );
    const first = await create(600, staffUserId, roomId);
    // Overlaps the first one by half an hour, with other staff.
    const second = await create(630, staffAdminUserId, roomId);
    // Same time as the first one, in another room.
    const elsewhere = await create(600, staffAdminUserId, otherRoomId);

    const probe = async (startDayminute: number, extra: Partial<ConflictsRequest> = {}) => {
      const [sample] = await meetingConflicts(staffApi, facilityId, {
        samples: [{date, startDayminute, durationMinutes: 30}],
        resources: true,
        ...extra,
      });
      return Object.fromEntries(sample!.resources!.map((r) => [r.id, r.meetingIds.toSorted()]));
    };
    expect(await probe(630)).toEqual({[roomId]: [first, second].toSorted(), [otherRoomId]: [elsewhere]});
    expect(await probe(600)).toEqual({[roomId]: [first], [otherRoomId]: [elsewhere]});
    expect(await probe(630, {ignoreMeetingIds: [second, elsewhere]})).toEqual({[roomId]: [first]});
    // Touching intervals do not overlap.
    expect(await probe(690)).toEqual({});

    interface ConflictRow {
      readonly "id": string;
      readonly "resourceConflicts.exists": boolean | null;
      readonly "resourceConflicts.*.meetingId": readonly string[];
      readonly "resourceConflicts.*.resourceDictId": readonly string[];
    }
    const conflictRows = async () => {
      const {rows} = await staffApi.tquery<ConflictRow>(`facility/${facilityId}/meeting/tquery`, {
        columns: [
          "id",
          "resourceConflicts.exists",
          "resourceConflicts.*.meetingId",
          "resourceConflicts.*.resourceDictId",
        ],
        filter: {type: "column", column: "id", op: "in", val: [first, second, elsewhere]},
      });
      return new Map(rows.map((row) => [row.id, row]));
    };
    let rows = await conflictRows();
    expect(rows.get(first)).toMatchObject({
      "resourceConflicts.exists": true,
      "resourceConflicts.*.meetingId": [second],
      "resourceConflicts.*.resourceDictId": [roomId],
    });
    expect(rows.get(second)).toMatchObject({
      "resourceConflicts.exists": true,
      "resourceConflicts.*.meetingId": [first],
      "resourceConflicts.*.resourceDictId": [roomId],
    });
    expect(rows.get(elsewhere)).toMatchObject({
      "resourceConflicts.exists": false,
      "resourceConflicts.*.meetingId": [],
    });

    // A cancelled meeting does not occupy the resource.
    await staffApi.patchMeeting(facilityId, second, {statusDictId: dicts.meetingStatus!.cancelled!});
    expect(await probe(630)).toEqual({[roomId]: [first], [otherRoomId]: [elsewhere]});
    rows = await conflictRows();
    expect(rows.get(first)!["resourceConflicts.exists"]).toBe(false);
    expect(rows.get(second)!["resourceConflicts.exists"]).toBe(false);
  });

  readOnlyTest("meeting endpoints are for facility staff and admins only", async ({api}) => {
    const {facilityId, staffUserId, todayMeeting} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const dicts = await staffApi.dictionaries();
    const base = `facility/${facilityId}/meeting`;
    const newMeeting = {
      typeDictId: dicts.meetingType!.other!,
      date: seededDay(5),
      startDayminute: 600,
      durationMinutes: 60,
      statusDictId: dicts.meetingStatus!.planned!,
      staff: [{userId: staffUserId, attendanceStatusDictId: dicts.attendanceStatus!.ok!}],
    };
    const FAIL = {allowFailure: true};
    const before = await listMeetings(staffApi, facilityId, [todayMeeting.id]);
    const allIds = await queryMeetingIds(staffApi, facilityId, undefined);
    for (const [who, client, status] of [
      ["bare member", await api.loggedInAs(BARE_MEMBER), 403],
      ["anonymous", api, 401],
    ] as const) {
      const responses = {
        list: await client.get(`${base}/list?in=${todayMeeting.id}`, FAIL),
        tquery: await client.post(
          `${base}/tquery`,
          {columns: [{type: "column", column: "id"}], paging: {size: 1}},
          FAIL,
        ),
        attendants: await client.get(`${base}/attendant/tquery`, FAIL),
        clients: await client.get(`${base}/client/tquery`, FAIL),
        create: await client.createMeeting(facilityId, newMeeting, FAIL),
        patch: await client.patchMeeting(facilityId, todayMeeting.id, {notes: "hijacked"}, FAIL),
        clone: await client.post(`${base}/${todayMeeting.id}/clone`, {dates: [seededDay(5)], interval: "1d"}, FAIL),
        conflicts: await client.post(
          `${base}/conflicts`,
          {samples: [{date: seededDay(0), startDayminute: 600, durationMinutes: 60}], staff: true},
          FAIL,
        ),
        delete: await client.delete(`${base}/${todayMeeting.id}`, undefined, FAIL),
      };
      for (const [name, res] of Object.entries(responses)) {
        expect(res.status(), `${who}: ${name}`).toBe(status);
      }
    }
    expect(await listMeetings(staffApi, facilityId, [todayMeeting.id])).toEqual(before);
    expect(await queryMeetingIds(staffApi, facilityId, undefined)).toEqual(allIds);

    // A facility admin who is not staff has the full access.
    const adminApi = await api.loggedInAs(ADMIN);
    expect((await listMeetings(adminApi, facilityId, [todayMeeting.id])).map((m) => m.id)).toEqual([todayMeeting.id]);
    expect(await queryMeetingIds(adminApi, facilityId, undefined)).toEqual(allIds);
  });
});
