import {createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useMeetingTableColumns} from "features/meeting/meeting_tables";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const meetingTableColumns = useMeetingTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
      staticEntityURL={`facility/${activeFacilityId()}/meeting/attendant`}
      staticTranslations={createTableTranslations(["meetingAttendant", "meeting"])}
      staticPersistenceKey="facilityMeetingAttendants"
      // This table has multiple heavy to render columns.
      nonBlocking
      intrinsicSort={[
        {type: "column", column: "date", desc: true},
        {type: "column", column: "startDayminute", desc: true},
      ]}
      columns={meetingTableColumns.get(
        "attendanceType",
        "attendant",
        "attendanceStatus",
        "id",
        "date",
        "time",
        "duration",
        "isInSeries",
        "category",
        "type",
        "statusTags",
        ["attendants", {initialVisible: false}],
        "attendantsAttendance",
        "staff",
        "staffAttendance",
        "clients",
        "clientsAttendance",
        "isRemote",
        "notes",
        "resources",
        "createdAt",
        "createdBy",
        "updatedAt",
        "actions",
      )}
      initialSort={[{id: "date", desc: true}]}
    />
  );
}) satisfies VoidComponent;
