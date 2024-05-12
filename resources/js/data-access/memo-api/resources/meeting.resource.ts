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
  readonly staff: readonly MeetingAttendantResource[];
  readonly clients: readonly MeetingAttendantResource[];
  readonly resources: readonly MeetingResourceResource[];
  readonly fromMeetingId: string | null;
  readonly interval: string | null;
}

export interface MeetingAttendantResource {
  readonly userId: string;
  readonly attendanceStatusDictId: string;
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
  readonly staff: readonly MeetingAttendantResourceForCreate[];
  readonly clients: readonly MeetingAttendantResourceForCreate[];
} & PartialNullable<Pick<MeetingResource, "date" | "startDayminute" | "durationMinutes">>;

export type MeetingAttendantResourceForCreate = Pick<MeetingAttendantResource, "userId" | "attendanceStatusDictId">;

export type MeetingResourceForPatch = Api.Entity & MeetingResourceForCreate;
