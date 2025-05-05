import {useQuery} from "@tanstack/solid-query";
import {EditButton} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {AUTO_SIZE_COLUMN_DEFS, createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {PartialColumnConfig, TQueryTable} from "components/ui/Table/TQueryTable";
import {NON_NULLABLE} from "components/utils/array_filter";
import {Users} from "data-access/memo-api/groups/shared";
import {User} from "data-access/memo-api/groups/User";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {createFacilityAdminEditModal} from "features/user-edit/facility_admin_edit_modal";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const {getCreatedUpdatedColumns} = useTableColumns();
  const facilityAdminEditModal = createFacilityAdminEditModal();
  const status = useQuery(User.statusQueryOptions);
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
        isFacilityAdmin()
          ? ({
              name: "actions",
              isDataColumn: false,
              extraDataColumns: ["id"],
              columnDef: {
                cell: (c) => (
                  <PaddedCell>
                    <EditButton
                      class="minimal -my-px"
                      onClick={() => facilityAdminEditModal.show({userId: c.row.original.id as string})}
                    />
                  </PaddedCell>
                ),
                enableSorting: false,
                enableHiding: false,
                ...AUTO_SIZE_COLUMN_DEFS,
              },
            } satisfies PartialColumnConfig)
          : undefined,
      ].filter(NON_NULLABLE)}
      intrinsicFilter={{type: "column", column: "member.hasFacilityAdmin", op: "=", val: true}}
      intrinsicSort={[{type: "column", column: "name", desc: false}]}
      initialSort={[{id: "name", desc: false}]}
      savedViews
    />
  );
}) satisfies VoidComponent;
