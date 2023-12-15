/**
 * The meeting resource.
 * @see `/help/tables/meetings.md`
 * @see `/app/Http/Resources/MeetingResource.php`
 */
export interface MeetingResource {
  readonly id: string;
  readonly facilityId: string;
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
  "typeDictId" | "notes" | "isRemote" | "staff" | "clients" | "resources"
> &
  // This part is actually required by the API, but has no default values, so making it optional
  // is necessary to construct a create form.
  Partial<Pick<MeetingResource, "date" | "startDayminute" | "durationMinutes">>;
