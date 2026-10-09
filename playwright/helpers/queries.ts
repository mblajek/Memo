import type {MemoAPI} from "../lib/api.ts";
import {createdId, responseData} from "../lib/responses.ts";

/** Reads of the server state, and requests, that several specs use. */

export interface UserAccount {
  readonly name: string;
  readonly email: string | null;
  readonly hasEmailVerified: boolean;
  readonly hasPassword: boolean;
  readonly passwordExpireAt: string | null;
  readonly otpRequiredAt: string | null;
  readonly hasOtpConfigured: boolean;
  readonly hasGlobalAdmin: boolean;
  readonly managedByFacilityId: string | null;
  readonly members: readonly UserAccountMember[];
}

export interface UserAccountMember {
  readonly facilityId: string;
  readonly hasFacilityAdmin: boolean;
  readonly isFacilityStaff: boolean;
  readonly isActiveFacilityStaff: boolean;
  readonly isFacilityClient: boolean;
}

/** The user as the global admin's API gives it. */
export async function userAccount(adminApi: MemoAPI, userId: string) {
  return (await adminApi.list<UserAccount>("admin/user", userId))[0]!;
}

export interface MeetingClient {
  readonly userId: string;
  readonly clientGroupId: string | null;
  readonly attendanceStatusDictId: string;
  readonly notifications: readonly {
    readonly id: string;
    readonly status: string;
    readonly notificationMethodDictId: string;
    readonly scheduledAt: string;
  }[];
}

/** The clients of the meeting, in the order of the meeting. */
export async function meetingClients(api: MemoAPI, facilityId: string, meetingId: string) {
  const [meeting] = await api.list<{clients: readonly MeetingClient[]}>(`facility/${facilityId}/meeting`, meetingId);
  return meeting!.clients;
}

export async function meetingClientIds(api: MemoAPI, facilityId: string, meetingId: string) {
  return (await meetingClients(api, facilityId, meetingId)).map(({userId}) => userId);
}

/** Whether the facility has a client of the given user id. */
export async function clientExists(api: MemoAPI, facilityId: string, clientUserId: string) {
  const {total} = await api.tquery(`facility/${facilityId}/user/client/tquery`, {
    columns: ["id"],
    filter: {type: "column", column: "id", op: "=", val: clientUserId},
  });
  return total === 1;
}

/** The client part of the client: its own fields and the attributes of the facility. */
export async function clientAttributes(api: MemoAPI, facilityId: string, clientUserId: string) {
  const [client] = await api.list<{client: Record<string, unknown>}>(
    `facility/${facilityId}/user/client`,
    clientUserId,
  );
  return client!.client;
}

/** The name of the logged-in user. */
export async function userName(api: MemoAPI) {
  return (await api.getData<{user: {name: string}}>("user/status")).user.name;
}

/** The facility the logged-in user was last in, as the server has it. */
export async function lastLoginFacilityId(api: MemoAPI) {
  return (await api.getData<{user: {lastLoginFacilityId: string | null}}>("user/status")).user.lastLoginFacilityId;
}

/** The keys that the user has in the storage of the server. */
export async function storageKeys(api: MemoAPI) {
  return (await (await api.get("user/storage")).json()) as readonly string[];
}

/** The value that the user has in the storage of the server under the key. */
export async function storageValue(api: MemoAPI, key: string) {
  return (await (await api.get(`user/storage/${key}`)).json()) as unknown;
}

export interface ConflictsRequest {
  readonly samples: readonly {
    readonly date: string;
    readonly startDayminute: number;
    readonly durationMinutes: number;
  }[];
  readonly staff?: boolean;
  readonly clients?: boolean;
  readonly resources?: boolean;
  readonly ignoreMeetingIds?: readonly string[];
}

/** What is taken in the time of a sample, and the meetings taking it. */
export interface Conflict {
  readonly id: string;
  readonly meetingIds: readonly string[];
}

/** The conflicts of each of the samples, of the kinds asked for. */
export async function meetingConflicts(api: MemoAPI, facilityId: string, request: ConflictsRequest) {
  return await responseData<
    readonly Readonly<Partial<Record<"staff" | "clients" | "resources", readonly Conflict[]>>>[]
  >(await api.post(`facility/${facilityId}/meeting/conflicts`, request));
}

/** Copies the meeting to the dates, as a series with it; returns the ids of the copies. */
export async function cloneMeeting(
  api: MemoAPI,
  facilityId: string,
  meetingId: string,
  dates: readonly string[],
  interval: string | null = "7d",
) {
  const res = await api.post(`facility/${facilityId}/meeting/${meetingId}/clone`, {dates, interval});
  return (await responseData<{ids: readonly string[]}>(res)).ids;
}

/** Adds a facility position to the (global, extendable) dictionary of meeting resources. */
export async function createMeetingResource(adminApi: MemoAPI, facilityId: string, name: string) {
  return createdId(
    await adminApi.post(`facility/${facilityId}/admin/position`, {
      dictionaryId: await adminApi.dictionaryId("meetingResource"),
      name: `+${name}`,
      isDisabled: false,
    }),
  );
}

/**
 * The body of a request creating an attribute: of a client, optional, single-value and named after
 * its api name, unless `extra` says otherwise.
 */
export function attributeToCreate(apiName: string, type: string, extra: Readonly<Record<string, unknown>> = {}) {
  return {
    model: "client",
    name: `+${apiName}`,
    apiName,
    type,
    dictionaryId: null,
    isMultiValue: false,
    requirementLevel: "optional",
    description: null,
    ...extra,
  };
}
