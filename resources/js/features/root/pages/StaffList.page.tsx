import {Email} from "components/ui/Email";
import {PaddedCell, ShowCellVal, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {getCreatedUpdatedColumns} from "data-access/memo-api/tquery/table_columns";
import {UserLink} from "features/facility-users/UserLink";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={FacilityStaff.keys.staff()}
        staticEntityURL={`facility/${activeFacilityId()}/user/staff`}
        staticTranslations={createTableTranslations(["staff", "user"])}
        staticPersistenceKey="facilityStaff"
        columns={[
          {name: "id", initialVisible: false},
          {
            name: "name",
            extraDataColumns: ["id"],
            columnDef: {
              cell: cellFunc<string>((props) => (
                <PaddedCell>
                  <ShowCellVal v={props.v}>
                    {(v) => <UserLink type="staff" userId={props.row.id as string} name={v()} />}
                  </ShowCellVal>
                </PaddedCell>
              )),
              enableHiding: false,
            },
          },
          {
            name: "email",
            columnDef: {
              cell: cellFunc<string>((props) => (
                <PaddedCell>
                  <ShowCellVal v={props.v}>{(v) => <Email class="w-full" email={v()} />}</ShowCellVal>
                </PaddedCell>
              )),
            },
          },
          {name: "hasEmailVerified", initialVisible: false},
          {name: "hasPassword"},
          {name: "passwordExpireAt", initialVisible: false},
          {name: "hasFacilityAdmin", columnDef: {size: 130}, initialVisible: false},
          {name: "hasGlobalAdmin", columnDef: {size: 130}, initialVisible: false},
          ...getCreatedUpdatedColumns({includeUpdatedBy: false}),
        ]}
        initialSort={[{id: "name", desc: false}]}
      />
    </>
  );
}) satisfies VoidComponent;
