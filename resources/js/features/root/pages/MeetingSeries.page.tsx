import {useParams} from "@solidjs/router";
import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {NON_NULLABLE} from "components/utils/array_filter";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {useMeetingTableColumns, useMeetingTableFilters} from "features/meeting/meeting_tables";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const params = useParams();
  const cols = useMeetingTableColumns();
  const meetingTableFilters = useMeetingTableFilters();
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
      staticEntityURL={`facility/${activeFacilityId()}/meeting`}
      staticTranslations={createTableTranslations("meeting")}
      staticPersistenceKey="facilityMeetingSeries"
      // This table has multiple heavy to render columns.
      nonBlocking
      intrinsicFilter={{
        type: "op",
        op: "&",
        val: [
          meetingTableFilters.isRegularMeeting(),
          {type: "column", column: "fromMeetingId", op: "=", val: params.fromMeetingId || ""} satisfies FilterH,
        ].filter(NON_NULLABLE),
      }}
      columns={[
        cols.meeting.get("seriesNumber", {initialVisible: true}),
        cols.meeting.id,
        cols.meeting.date,
        cols.meeting.time,
        cols.meeting.duration,
        cols.meeting.get("seriesInfo", {initialVisible: false}),
        cols.meeting.seriesType,
        cols.meeting.category,
        cols.meeting.type,
        cols.meeting.statusTags,
        cols.meeting.isFacilityWide,
        cols.meeting.attendants,
        cols.meeting.attendantsAttendance,
        cols.meeting.attendantsCount,
        cols.meeting.get("staff", {initialVisible: false}),
        cols.meeting.staffAttendance,
        cols.meeting.staffCount,
        cols.meeting.get("clients", {initialVisible: false}),
        cols.meeting.clientsAttendance,
        cols.meeting.clientsCount,
        cols.meeting.get("isRemote", {initialVisible: false}),
        cols.meeting.notes,
        cols.meeting.resources,
        cols.meeting.resourcesCount,
        ...getCreatedUpdatedColumns(),
        cols.meeting.actions,
      ]}
      columnGroups={false}
      intrinsicSort={[{type: "column", column: "seriesNumber", desc: false}]}
    />
  );
}) satisfies VoidComponent;
