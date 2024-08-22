import {Api, PartialNullable} from "../types";
import {CreatedUpdatedResource} from "./resource";

/**
 * The meeting resource.
 * @see `/help/tables/meetings.md`
 * @see `/app/Http/Resources/MeetingResource.php`
 */
export interface MeetingResource extends CreatedUpdatedResource {
  readonly id: string;
  readonly facilityId: string;
  readonly categoryDictId: string;
  readonly typeDictId: string;
  readonly notes: string | null;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
  readonly statusDictId: string;
  readonly isRemote: boolean;
  readonly staff: readonly MeetingStaffResource[];
  readonly clients: readonly MeetingClientResource[];
  readonly resources: readonly MeetingResourceResource[];
  readonly fromMeetingId: string | null;
  readonly interval: string | null;
}

interface MeetingAttendantResourceBase {
  readonly userId: string;
  readonly attendanceStatusDictId: string;
}

export interface MeetingStaffResource extends MeetingAttendantResourceBase {}

export interface MeetingClientResource extends MeetingAttendantResourceBase {
  readonly clientGroupId: string | null;
}

export interface MeetingResourceResource {
  readonly resourceDictId: string;
}

export type MeetingResourceForCreate = Pick<
  MeetingResource,
  | "typeDictId"
  | "notes"
  // The date and time part is actually required by the API, but has no default values,
  // so making it optional is necessary to construct a create form.
  // | "date"
  // | "startDayminute"
  // | "durationMinutes"
  | "statusDictId"
  | "isRemote"
  | "resources"
> & {
  readonly staff: readonly MeetingStaffResourceForCreate[];
  readonly clients: readonly MeetingClientResourceForCreate[];
} & PartialNullable<Pick<MeetingResource, "date" | "startDayminute" | "durationMinutes">>;

export type MeetingStaffResourceForCreate = Pick<MeetingStaffResource, "userId" | "attendanceStatusDictId">;

export type MeetingClientResourceForCreate = Pick<
  MeetingClientResource,
  "userId" | "clientGroupId" | "attendanceStatusDictId"
>;

export type MeetingResourceForPatch = Api.Entity & MeetingResourceForCreate;
