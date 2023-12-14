import {createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {EN_DASH} from "components/ui/symbols";
import {formatDayMinuteHM} from "components/utils/day_minute_util";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
        staticEntityURL={`facility/${activeFacilityId()}/meeting`}
        staticTranslations={createTableTranslations("meetings")}
        staticPersistenceKey="facilityMeetings"
        intrinsicSort={[{type: "column", column: "date", desc: true}]}
        columns={[
          {name: "id", initialVisible: false},
          {name: "date"},
          {
            name: "startDayminute",
            extraDataColumns: ["durationMinutes"],
            columnDef: {
              cell: (c) => (
                <span>
                  {formatDayMinuteHM(c.row.getValue<number>("startDayminute"), {hour: "2-digit"})} {EN_DASH}{" "}
                  {formatDayMinuteHM(
                    c.row.getValue<number>("startDayminute") + c.row.getValue<number>("durationMinutes"),
                    {hour: "2-digit"},
                  )}
                </span>
              ),
              enableColumnFilter: false,
              size: 120,
            },
          },
          {name: "durationMinutes", initialVisible: false, columnDef: {size: 120}},
          {name: "categoryDictId", initialVisible: false},
          {name: "typeDictId"},
          {name: "statusDictId"},
          {name: "staff.*.name"},
          {name: "clients.*.name"},
          {name: "notes"},
          {name: "resources.*.dictId"},
          {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false},
          {name: "createdBy.name", initialVisible: false},
          {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
        ]}
        initialSort={[{id: "date", desc: true}]}
      />
    </>
  );
}) satisfies VoidComponent;
