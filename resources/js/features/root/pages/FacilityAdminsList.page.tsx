import {createQuery} from "@tanstack/solid-query";
import {Email} from "components/ui/Email";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {NON_NULLABLE} from "components/utils/array_filter";
import {Users} from "data-access/memo-api/groups/shared";
import {User} from "data-access/memo-api/groups/User";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const {getCreatedUpdatedColumns} = useTableColumns();
  const status = createQuery(User.statusQueryOptions);
  const isFacilityAdmin = () => status.data?.permissions.facilityAdmin;
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={Users.keys.user()}
      staticEntityURL={`facility/${activeFacilityId()}/user`}
      staticTranslations={createTableTranslations(["facility_admin", "facility_user", "user"])}
      staticPersistenceKey="facilityAdmins"
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
        isFacilityAdmin() ? {name: "hasEmailVerified", initialVisible: false} : undefined,
        isFacilityAdmin() ? {name: "passwordExpireAt", initialVisible: false} : undefined,
        isFacilityAdmin() ? {name: "lastPasswordChangeAt", initialVisible: false} : undefined,
        {name: "lastLoginSuccessAt", initialVisible: false},
        isFacilityAdmin() ? {name: "lastLoginFailureAt", initialVisible: false} : undefined,
        {name: "member.isStaff", columnDef: {size: 130}},
        {name: "member.isActiveStaff", columnDef: {size: 130}, initialVisible: false},
        {name: "hasGlobalAdmin", columnDef: {size: 130}},
        ...getCreatedUpdatedColumns(),
      ].filter(NON_NULLABLE)}
      intrinsicFilter={{type: "column", column: "member.hasFacilityAdmin", op: "=", val: true}}
      intrinsicSort={[{type: "column", column: "name", desc: false}]}
      initialSort={[{id: "name", desc: false}]}
      savedViews
    />
  );
}) satisfies VoidComponent;
