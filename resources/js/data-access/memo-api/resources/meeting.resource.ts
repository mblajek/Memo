/**
 * The meeting resource.
 * @see `/help/tables/meetings.md`
 * @see `/app/Http/Resources/MeetingResource.php`
 */
export interface MeetingResource {
  readonly id: string;
  readonly facilityId: string;
  readonly categoryDictId: string;
  readonly typeDictId: string;
  readonly notes: string;
  readonly date: string;
  readonly startDayminute: number;
  readonly durationMinutes: number;
  readonly statusDictId: string;
  readonly createdBy: string;
  readonly isRemote: boolean;
  readonly staff: readonly MeetingAttendantResource[];
  readonly clients: readonly MeetingAttendantResource[];
  readonly resources: readonly MeetingResourceResource[];
  readonly fromMeetingId: string | null;
}

export interface MeetingAttendantResource {
  readonly userId: string;
  readonly attendanceStatusDictId: string | null;
}

export interface MeetingResourceResource {
  readonly resourceDictId: string;
}

export type MeetingResourceForCreate = Pick<
  MeetingResource,
  | "typeDictId"
  | "notes"
  // See below for why these are not included.
  // | "date"
  // | "startDayminute"
  // | "durationMinutes"
  | "statusDictId"
  | "isRemote"
  | "staff"
  | "clients"
  | "resources"
  | "fromMeetingId"
> &
  // This part is actually required by the API, but has no default values, so making it optional
  // is necessary to construct a create form.
  Partial<Pick<MeetingResource, "date" | "startDayminute" | "durationMinutes">>;
