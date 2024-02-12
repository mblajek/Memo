import {Button, EditButton} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {USER_ICONS} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups";
import {createUserCreateModal} from "features/user-edit/user_create_modal";
import {createUserEditModal} from "features/user-edit/user_edit_modal";
import {VoidComponent} from "solid-js";

export default (() => {
  const t = useLangFunc();
  const userCreateModal = createUserCreateModal();
  const userEditModal = createUserEditModal();
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
            cell: cellFunc<string>((v) => (
              <PaddedCell>
                <Email class="w-full" email={v} />
              </PaddedCell>
            )),
          },
        },
        {name: "hasEmailVerified", initialVisible: false},
        {name: "hasPassword"},
        {name: "passwordExpireAt", initialVisible: false},
        {name: "facilities.count", initialVisible: false},
        {
          name: "hasGlobalAdmin",
          columnDef: {size: 130},
        },
        {name: "createdAt", columnDef: {sortDescFirst: true}},
        {name: "createdBy.name", initialVisible: false},
        {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
        {
          name: "actions",
          isDataColumn: false,
          extraDataColumns: ["id"],
          columnDef: {
            cell: (c) => (
              <PaddedCell>
                <EditButton class="minimal" onClick={() => userEditModal.show({userId: c.row.original.id as string})} />
              </PaddedCell>
            ),
            enableSorting: false,
            ...AUTO_SIZE_COLUMN_DEFS,
          },
        },
      ]}
      initialSort={[{id: "name", desc: false}]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <Button class="secondary small" onClick={() => userCreateModal.show()}>
            <USER_ICONS.add class="inlineIcon text-current" /> {t("actions.user.add")}
          </Button>
        </div>
      }
    />
  );
}) satisfies VoidComponent;
