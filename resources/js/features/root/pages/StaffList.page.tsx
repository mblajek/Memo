import {Email} from "components/ui/Email";
import {PaddedCell, ShowCellVal, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
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
        staticTranslations={createTableTranslations("staff")}
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
          {
            name: "hasGlobalAdmin",
            columnDef: {size: 130},
            initialVisible: false,
          },
          {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false},
          {name: "createdBy.name", initialVisible: false},
          {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
        ]}
        initialSort={[{id: "name", desc: false}]}
      />
    </>
  );
}) satisfies VoidComponent;
