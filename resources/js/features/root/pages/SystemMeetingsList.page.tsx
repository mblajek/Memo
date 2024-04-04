import {createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {getCreatedUpdatedColumns} from "data-access/memo-api/tquery/table_columns";
import {useMeetingTableColumns, useMeetingTableFilters} from "features/meeting/meeting_tables";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

// List page for meetings from category system. It is not accessible from the menu (only for DEV).
export default (() => {
  const meetingTableColumns = useMeetingTableColumns();
  const meetingTableFilters = useMeetingTableFilters();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
      staticEntityURL={`facility/${activeFacilityId()}/meeting`}
      staticTranslations={createTableTranslations("meeting")}
      staticPersistenceKey="systemMeetings"
      intrinsicFilter={meetingTableFilters.isSystemMeeting()}
      intrinsicSort={[
        {type: "column", column: "date", desc: false},
        {type: "column", column: "startDayminute", desc: false},
      ]}
      columns={meetingTableColumns.get(
        "id",
        "date",
        "time",
        "duration",
        "isInSeries",
        "seriesType",
        "category",
        "type",
        "staff",
        ...getCreatedUpdatedColumns(),
        "actions",
      )}
      initialSort={[{id: "date", desc: false}]}
    />
  );
}) satisfies VoidComponent;
