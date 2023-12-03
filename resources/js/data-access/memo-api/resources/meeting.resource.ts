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

export interface MeetingAttendantResource {
  id: string;
  meetingId: string;
  userId: string;
  attendanceType: string;
  attendanceStatusDictId: string;
}

export interface MeetingResourceResource {
  id: string;
  meetingId: string;
  resourceDictId: string;
}
