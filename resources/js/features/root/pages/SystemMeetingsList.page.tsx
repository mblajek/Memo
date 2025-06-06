import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {useMeetingTableColumns, useMeetingTableFilters} from "features/meeting/meeting_tables";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

// List page for meetings from category system. It is not accessible from the menu (only for DEV).
export default (() => {
  const cols = useMeetingTableColumns();
  const meetingTableFilters = useMeetingTableFilters();
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
      staticEntityURL={`facility/${activeFacilityId()}/meeting`}
      staticTranslations={createTableTranslations("meeting")}
      staticPersistenceKey="systemMeetings"
      intrinsicFilter={meetingTableFilters.isSystemMeeting() || "never"}
      intrinsicSort={[
        {type: "column", column: "date", desc: false},
        {type: "column", column: "startDayminute", desc: false},
      ]}
      columns={[
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
        cols.meeting.staff,
        ...getCreatedUpdatedColumns(),
        cols.meeting.actions,
      ]}
      columnGroups={{overrides: {meeting_multicolumn: false}}}
      initialSort={[{id: "date", desc: false}]}
    />
  );
}) satisfies VoidComponent;
