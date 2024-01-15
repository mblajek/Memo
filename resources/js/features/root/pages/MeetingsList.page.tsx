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
      staticEntityURL={`facility/${activeFacilityId()}/meeting`}
      staticTranslations={createTableTranslations("meeting")}
      staticPersistenceKey="facilityMeetings"
      intrinsicSort={[{type: "column", column: "date", desc: true}]}
      columns={meetingTableColumns.get(
        "id",
        "date",
        "time",
        "duration",
        "category",
        "type",
        "status",
        "staff",
        "clients",
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
