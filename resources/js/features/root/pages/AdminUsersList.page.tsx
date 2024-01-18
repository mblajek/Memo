import {Button, EditButton} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {USER_ICONS} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups";
import {UserCreateModal, showUserCreateModal} from "features/user-edit/UserCreateModal";
import {UserEditModal, showUserEditModal} from "features/user-edit/UserEditModal";
import {VoidComponent} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <>
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
                  <EditButton onClick={() => showUserEditModal({userId: c.row.getValue("id")})} />
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
            <Button class="secondary small" onClick={() => showUserCreateModal()}>
              <USER_ICONS.add class="inlineIcon text-current" /> {t("actions.add_user")}
            </Button>
          </div>
        }
      />
      <UserEditModal />
      <UserCreateModal />
    </>
  );
}) satisfies VoidComponent;
