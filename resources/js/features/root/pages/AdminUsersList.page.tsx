import {Button, EditButton} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AUTO_SIZE_COLUMN_DEFS, createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {userIcons} from "components/ui/icons";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {useLangFunc} from "components/utils/lang";
import {Admin} from "data-access/memo-api/groups/Admin";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {createUserCreateModal} from "features/user-edit/user_create_modal";
import {createUserEditModal} from "features/user-edit/user_edit_modal";
import {Show, VoidComponent} from "solid-js";

export default (() => {
  const t = useLangFunc();
  const userCreateModal = createUserCreateModal();
  const userEditModal = createUserEditModal();
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={Admin.keys.user()}
      staticEntityURL="admin/user"
      staticTranslations={createTableTranslations("user")}
      staticPersistenceKey="adminUsers"
      columns={[
        {name: "id", initialVisible: false},
        {name: "name", columnDef: {enableHiding: false}},
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
        {name: "lastPasswordChangeAt", initialVisible: false},
        {name: "lastLoginSuccessAt", initialVisible: false},
        {name: "lastLoginFailureAt", initialVisible: false},
        {name: "facilities.*.name", initialVisible: false},
        {name: "facilities.count", initialVisible: false},
        {name: "managedByFacility.name", initialVisible: false},
        {name: "lastLoginFacility.name", initialVisible: false},
        {name: "hasGlobalAdmin", columnDef: {size: 130}},
        {name: "hasFacilityAdmin", columnDef: {size: 130}, initialVisible: false},
        {name: "isStaff", initialVisible: false},
        {name: "isClient", initialVisible: false},
        ...getCreatedUpdatedColumns({globalAdmin: true}),
        {
          name: "actions",
          isDataColumn: false,
          // TODO: Introduce a proper safety check for unmodifiable users once the backend supports it.
          extraDataColumns: ["id", "email"],
          columnDef: {
            cell: (c) => (
              <PaddedCell>
                <Show
                  when={!c.row.original.email || (c.row.original.email as string).includes("@")}
                  fallback={<EmptyValueSymbol />}
                >
                  <EditButton
                    class="minimal -my-px"
                    onClick={() => userEditModal.show({userId: c.row.original.id as string})}
                  />
                </Show>
              </PaddedCell>
            ),
            enableSorting: false,
            enableHiding: false,
            ...AUTO_SIZE_COLUMN_DEFS,
          },
        },
      ]}
      intrinsicSort={[{type: "column", column: "updatedAt", desc: true}]}
      initialSort={[{id: "name", desc: false}]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <Button class="secondary small" onClick={() => userCreateModal.show()}>
            <userIcons.Add class="inlineIcon" /> {t("actions.user.add")}
          </Button>
        </div>
      }
      savedViews
    />
  );
}) satisfies VoidComponent;
