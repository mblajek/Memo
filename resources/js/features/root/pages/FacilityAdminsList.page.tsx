import {Email} from "components/ui/Email";
import {PaddedCell, ShowCellVal, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {Users} from "data-access/memo-api/groups/shared";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={Users.keys.user()}
      staticEntityURL={`facility/${activeFacilityId()}/user`}
      staticTranslations={createTableTranslations(["facility_admin", "facility_user", "user"])}
      staticPersistenceKey="facilityAdmins"
      intrinsicFilter={{type: "column", column: "member.hasFacilityAdmin", op: "=", val: true}}
      columns={[
        {name: "id", initialVisible: false},
        {
          name: "name",
          columnDef: {enableHiding: false},
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
        {name: "passwordExpireAt", initialVisible: false},
        {name: "member.isStaff", columnDef: {size: 130}, initialVisible: false},
        {name: "hasGlobalAdmin", columnDef: {size: 130}},
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "name", desc: false}]}
    />
  );
}) satisfies VoidComponent;
