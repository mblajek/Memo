import {createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {useMeetingTableColumns} from "features/meeting/meeting_tables";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const cols = useMeetingTableColumns();
  const {meetingTypeDict} = useFixedDictionaries();
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
      staticEntityURL={`facility/${activeFacilityId()}/meeting`}
      staticTranslations={createTableTranslations(["time_table", "meeting"])}
      staticPersistenceKey="facilityTimeTablesFacilityTable"
      intrinsicFilter={{
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "isFacilityWide", op: "=", val: true},
          {
            type: "column",
            column: "typeDictId",
            op: "in",
            val: [meetingTypeDict()!.work_time.id, meetingTypeDict()!.leave_time.id],
          },
        ],
      }}
      intrinsicSort={[
        {type: "column", column: "date", desc: true},
        {type: "column", column: "startDayminute", desc: true},
      ]}
      columns={[
        cols.meeting.id,
        cols.meeting.date,
        cols.meeting.time,
        cols.meeting.duration,
        cols.meeting.workTimeType,
        cols.meeting.workTimeNotes,
        ...getCreatedUpdatedColumns(),
        cols.meeting.actions,
      ]}
      columnGroups={false}
      initialSort={[{id: "date", desc: true}]}
    />
  );
}) satisfies VoidComponent;
