import {createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {useTableAttributeColumnConfigs} from "features/client/ClientFields";
import {useMeetingTableColumns, useMeetingTableFilters} from "features/meeting/meeting_tables";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const meetingTableColumns = useMeetingTableColumns();
  const meetingTableFilters = useMeetingTableFilters();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const tableAttributeColumnConfigs = useTableAttributeColumnConfigs();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
      staticEntityURL={`facility/${activeFacilityId()}/meeting/client`}
      staticTranslations={createTableTranslations([
        "meeting_client",
        "meeting_attendant",
        "client",
        "facility_user",
        "meeting",
      ])}
      staticPersistenceKey="facilityMeetingClients"
      // This table has multiple heavy to render columns.
      nonBlocking
      intrinsicFilter={meetingTableFilters.isRegularMeeting()}
      intrinsicSort={[
        {type: "column", column: "date", desc: true},
        {type: "column", column: "startDayminute", desc: true},
      ]}
      columns={meetingTableColumns.get(
        "attendantClient",
        tableAttributeColumnConfigs.client(),
        {name: "firstMeetingDate", initialVisible: false, columnGroups: "attendant"},
        {name: "lastMeetingDate", initialVisible: false, columnGroups: "attendant"},
        {name: "completedMeetingsCount", initialVisible: false, columnGroups: "attendant"},
        {name: "completedMeetingsCountLastMonth", initialVisible: false, columnGroups: "attendant"},
        {name: "plannedMeetingsCount", initialVisible: false, columnGroups: "attendant"},
        {name: "plannedMeetingsCountNextMonth", initialVisible: false, columnGroups: "attendant"},
        "attendanceStatus",
        "id",
        "date",
        "time",
        "duration",
        "isInSeries",
        "seriesType",
        "category",
        "type",
        "statusTags",
        ["attendants", {initialVisible: false}],
        "attendantsAttendance",
        "attendantsCount",
        "staff",
        "staffAttendance",
        "staffCount",
        "clients",
        "clientsAttendance",
        "clientsCount",
        "isRemote",
        "notes",
        "resources",
        ...getCreatedUpdatedColumns(),
        "actions",
      )}
      initialSort={[{id: "date", desc: true}]}
    />
  );
}) satisfies VoidComponent;
