import {useCustomTableCells} from "components/ui/Table/custom_table_cells";
import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {useTableAttributeColumnConfigs} from "features/client/ClientFields";
import {useMeetingTableColumns, useMeetingTableFilters} from "features/meeting/meeting_tables";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const cols = useMeetingTableColumns();
  const meetingTableFilters = useMeetingTableFilters();
  const customTableCells = useCustomTableCells();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const tableAttributeColumnConfigs = useTableAttributeColumnConfigs();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
      staticEntityURL={`facility/${activeFacilityId()}/meeting/client`}
      staticTranslations={createTableTranslations([
        "meeting_client",
        "meeting_multi_attendant",
        "meeting_attendant",
        "client",
        "facility_user",
        "meeting",
      ])}
      staticPersistenceKey="facilityMeetingClients"
      // This table has multiple heavy to render columns.
      nonBlocking
      columns={[
        cols.attendant.attendantClient,
        tableAttributeColumnConfigs.client(),
        {name: "client.groups.count", initialVisible: false, columnGroups: "attendant_multicolumn"},
        {name: "client.groups.*.role", initialVisible: false, columnGroups: "attendant_multicolumn"},
        {
          name: "client.groups.*.clients.*.userId",
          columnDef: {cell: customTableCells.facilityUsers()},
          initialVisible: false,
          columnGroups: "attendant_multicolumn",
        },
        {name: "firstMeetingDate", initialVisible: false, columnGroups: "attendant_multicolumn"},
        {name: "lastMeetingDate", initialVisible: false, columnGroups: "attendant_multicolumn"},
        {name: "completedMeetingsCount", initialVisible: false, columnGroups: "attendant_multicolumn"},
        {name: "completedMeetingsCountLastMonth", initialVisible: false, columnGroups: "attendant_multicolumn"},
        {name: "plannedMeetingsCount", initialVisible: false, columnGroups: "attendant_multicolumn"},
        {name: "plannedMeetingsCountNextMonth", initialVisible: false, columnGroups: "attendant_multicolumn"},
        ...getCreatedUpdatedColumns({entity: "client", overrides: {columnGroups: "attendant_multicolumn"}}),
        cols.attendant.get("attendantClientGroup", {initialVisible: true}),
        cols.attendant.attendanceStatus,
        cols.meeting.id,
        cols.meeting.date,
        cols.meeting.time,
        cols.meeting.duration,
        cols.meeting.seriesInfo,
        cols.meeting.seriesType,
        cols.meeting.seriesNumber,
        cols.meeting.seriesCount,
        cols.meeting.category,
        cols.meeting.type,
        cols.meeting.statusTags,
        cols.meeting.isFacilityWide,
        cols.meeting.get("attendants", {initialVisible: false}),
        cols.meeting.attendantsAttendance,
        cols.meeting.attendantsCount,
        cols.meeting.staff,
        cols.meeting.staffAttendance,
        cols.meeting.staffCount,
        cols.meeting.clients,
        cols.meeting.clientsAttendance,
        cols.meeting.clientsCount,
        cols.meeting.isRemote,
        cols.meeting.notes,
        cols.meeting.resources,
        cols.meeting.resourcesCount,
        cols.meeting.resourceConflictsExist,
        cols.meeting.resourceConflictsResources,
        ...getCreatedUpdatedColumns({overrides: {columnGroups: "meeting_multicolumn"}}),
        cols.meeting.actions,
      ]}
      intrinsicFilter={meetingTableFilters.isRegularMeeting()}
      intrinsicSort={[
        {type: "column", column: "date", desc: true},
        {type: "column", column: "startDayminute", desc: true},
      ]}
      initialSort={[{id: "date", desc: true}]}
      pageInfo={{href: "/help/reports-meeting-clients.part", fullPageHref: "/help/reports#meeting-clients"}}
      savedViews
    />
  );
}) satisfies VoidComponent;
