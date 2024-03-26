import {PaddedCell, ShowCellVal, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {UserLink} from "features/facility-users/UserLink";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={FacilityClient.keys.client()}
        staticEntityURL={`facility/${activeFacilityId()}/user/client`}
        staticTranslations={createTableTranslations(["client", "facility_user", "user"])}
        staticPersistenceKey="facilityClients"
        columns={[
          {name: "id", initialVisible: false},
          {
            name: "name",
            extraDataColumns: ["id"],
            columnDef: {
              cell: cellFunc<string>((props) => (
                <PaddedCell>
                  <ShowCellVal v={props.v}>
                    {(v) => <UserLink type="clients" userId={props.row.id as string} name={v()} />}
                  </ShowCellVal>
                </PaddedCell>
              )),
              enableHiding: false,
            },
          },
          {name: "client.genderDictId"},
          {name: "firstMeetingDate", initialVisible: false},
          {name: "lastMeetingDate"},
          {name: "completedMeetingsCount"},
          {name: "completedMeetingsCountLastMonth", initialVisible: false},
          {name: "plannedMeetingsCount", initialVisible: false},
          {name: "plannedMeetingsCountNextMonth"},
          ...getCreatedUpdatedColumns({includeUpdatedBy: false}),
        ]}
        initialSort={[{id: "name", desc: false}]}
      />
    </>
  );
}) satisfies VoidComponent;
