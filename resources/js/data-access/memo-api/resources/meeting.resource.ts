/**
 * The meeting resource.
 * @see `/help/tables/meetings.md`
 * @see `/app/Http/Resources/MeetingResource.php`
 */
export interface MeetingResource {
  id: string;
  facilityId: string;
  typeDictId: string;
  notes: string;
  date: string;
  startDayminute: number;
  durationMinutes: number;
  statusDictId: string;
  createdBy: string;
  isRemote: boolean;
  attendants: MeetingAttendantResource[];
  resources: MeetingResourceResource[];
}

export type AttendanceType = "client" | "staff";

export interface MeetingAttendantResource {
  userId: string;
  attendanceType: AttendanceType;
  attendanceStatusDictId: string;
}

export interface MeetingResourceResource {
  resourceDictId: string;
}

export type MeetingResourceForCreate = Pick<
  MeetingResource,
  "typeDictId" | "notes" | "isRemote" | "attendants" | "resources"
> &
  // This part is actually required by the API, but has no default values, so making it optional
  // is necessary to construct a create form.
  Partial<Pick<MeetingResource, "date" | "startDayminute" | "durationMinutes">>;
