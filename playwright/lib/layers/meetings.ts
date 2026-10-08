import {createdId} from "../responses.ts";
import {dateOffset} from "../dates.ts";
import type {MemoAPI} from "../api.ts";
import {type FacilityArtifact, STAFF_ADMIN} from "./facility.ts";
import {type ClientGroupsArtifact, clientGroupsLayer} from "./client_groups.ts";
import {type ClientsArtifact, clientsLayer} from "./clients.ts";

export type MeetingInfo = {
  readonly id: string;
  readonly date: string;
  readonly status: "planned" | "completed" | "cancelled";
};

export type MeetingsAddition = {
  readonly pastMeeting: MeetingInfo;
  readonly todayMeeting: MeetingInfo;
  readonly futureMeeting: MeetingInfo;
  /** Two extra meetings with varied size: 2 staff + 3 clients, and short duration. */
  readonly groupMeeting: MeetingInfo;
  readonly shortMeeting: MeetingInfo;
  /** Custom meeting types added via the facility-admin position endpoint. */
  readonly customTypeIds: {readonly therapy: string; readonly consult: string};
};

export type MeetingsArtifact = ClientsArtifact & MeetingsAddition;
export type MeetingsWithGroupsArtifact = ClientGroupsArtifact & MeetingsAddition;

/**
 * Memo's "meetingType" dictionary is fixed (its built-in positions are `other`, `work_time`,
 * `leave_time`) but is_extendable, so custom types can be added per-facility. The flow is:
 *   1. POST /facility/{id}/admin/position with the new name and its `category_dict_id`.
 *   2. The created position's id can then be used as `typeDictId` on meeting create.
 *
 * The Meeting model derives `category_dict_id` from the position's Category attribute. We seed
 * two custom types (one in each meetingCategory.other / .system bucket — note: "system" is the
 * conventional fallback; both keep the position visible across the app) so meeting tests can
 * assert behaviour across multiple types.
 */
async function createCustomMeetingType(
  api: MemoAPI,
  facility: FacilityArtifact,
  meetingTypeDictId: string,
  args: {name: string; categoryDictId: string; durationMinutes: number; defaultOrder: number},
): Promise<string> {
  const res = await api.post(`facility/${facility.facilityId}/admin/position`, {
    dictionaryId: meetingTypeDictId,
    name: args.name,
    isDisabled: false,
    defaultOrder: args.defaultOrder,
    categoryDictId: args.categoryDictId,
    durationMinutes: args.durationMinutes,
  });
  const id = await createdId(res);
  return id;
}

/**
 * Seeds custom meeting types then 5 meetings of varied shape: past/today/future singletons,
 * a multi-attendant group meeting, and a short 30-minute meeting on a custom type.
 */
async function setupMeetings(api: MemoAPI, parent: ClientsArtifact): Promise<MeetingsAddition> {
  // Use STAFF_ADMIN for everything — they have facilityAdmin (needed for postPosition) and
  // facilityStaff (needed for meeting create).
  await api.login(STAFF_ADMIN);
  const dicts = await api.dictionaries();
  const meetingType = dicts.meetingType!;
  const meetingStatus = dicts.meetingStatus!;
  const attendanceStatus = dicts.attendanceStatus!;
  const meetingCategory = dicts.meetingCategory!;

  const {facilityId, staffUserId, staffAdminUserId, adultClientInfos, childClientInfos} = parent;
  const ok = attendanceStatus.ok!;
  const typeOther = meetingType.other!;

  // Two custom meeting types: "therapy" (category=other) and "consult" (category=system).
  const meetingTypeDictId = await api.dictionaryId("meetingType");
  const therapyTypeId = await createCustomMeetingType(api, parent, meetingTypeDictId, {
    name: "Integration Test Therapy",
    categoryDictId: meetingCategory.other!,
    durationMinutes: 60,
    defaultOrder: 100,
  });
  const consultTypeId = await createCustomMeetingType(api, parent, meetingTypeDictId, {
    name: "Integration Test Consult",
    categoryDictId: meetingCategory.system!,
    durationMinutes: 30,
    defaultOrder: 101,
  });
  const customTypeIds = {therapy: therapyTypeId, consult: consultTypeId};

  async function create(args: {
    date: string;
    status: "planned" | "completed" | "cancelled";
    typeDictId: string;
    startDayminute?: number;
    durationMinutes?: number;
    staffUserIds?: readonly string[];
    clientUserIds?: readonly string[];
  }): Promise<MeetingInfo> {
    const res = await api.createMeeting(facilityId, {
      typeDictId: args.typeDictId,
      date: args.date,
      startDayminute: args.startDayminute ?? 600,
      durationMinutes: args.durationMinutes ?? 60,
      statusDictId: meetingStatus[args.status]!,
      isRemote: false,
      staff: (args.staffUserIds ?? [staffUserId]).map((userId) => ({userId, attendanceStatusDictId: ok})),
      clients: (args.clientUserIds ?? []).map((userId) => ({userId, attendanceStatusDictId: ok})),
    });
    const id = await createdId(res);
    return {id, date: args.date, status: args.status};
  }

  const pastMeeting = await create({
    date: dateOffset(-7),
    status: "completed",
    typeDictId: typeOther,
    clientUserIds: [adultClientInfos[0]!.id],
  });
  const todayMeeting = await create({
    date: dateOffset(0),
    status: "planned",
    typeDictId: typeOther,
    clientUserIds: [adultClientInfos[1]!.id],
  });
  const futureMeeting = await create({
    date: dateOffset(7),
    status: "planned",
    typeDictId: typeOther,
    clientUserIds: [adultClientInfos[2]!.id],
  });
  const groupMeeting = await create({
    date: dateOffset(1),
    status: "planned",
    typeDictId: therapyTypeId,
    startDayminute: 720,
    durationMinutes: 90,
    staffUserIds: [staffUserId, staffAdminUserId],
    clientUserIds: [adultClientInfos[3]!.id, childClientInfos[0]!.id, childClientInfos[1]!.id],
  });
  const shortMeeting = await create({
    date: dateOffset(2),
    status: "planned",
    typeDictId: consultTypeId,
    startDayminute: 540,
    durationMinutes: 30,
    clientUserIds: [adultClientInfos[4]!.id],
  });

  return {pastMeeting, todayMeeting, futureMeeting, groupMeeting, shortMeeting, customTypeIds};
}

export const meetingsLayer = clientsLayer.createSubLayer<MeetingsArtifact>(
  "Meetings",
  async ({api, parentArtifact}) => ({...parentArtifact, ...(await setupMeetings(api, parentArtifact))}),
);

export const meetingsWithGroupsLayer = clientGroupsLayer.createSubLayer<MeetingsWithGroupsArtifact>(
  "Meetings with Groups",
  async ({api, parentArtifact}) => ({...parentArtifact, ...(await setupMeetings(api, parentArtifact))}),
);
