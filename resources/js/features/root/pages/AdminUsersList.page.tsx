import {Button} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {AUTO_SIZE_COLUMN_DEFS, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups";
import {FiEdit2} from "solid-icons/fi";
import {TbUserPlus} from "solid-icons/tb";
import {VoidComponent} from "solid-js";
import {UserCreateForm} from "features/users-edit/UserCreate.form";
import {UserEditForm} from "features/users-edit/UserEdit.form";

export default (() => {
  const t = useLangFunc();
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.user()}
        staticEntityURL="admin/user"
        staticTranslations={createTableTranslations("users")}
        columns={[
          {name: "id", initialVisible: false},
          {name: "name", columnDef: {enableHiding: false}},
          {name: "email", columnDef: {cell: cellFunc<string>((v) => <Email class="w-full" email={v} />)}},
          {name: "hasEmailVerified", initialVisible: false},
          {name: "hasPassword"},
          {name: "passwordExpireAt", initialVisible: false},
          {name: "facilityCount", initialVisible: false},
          {
            name: "hasGlobalAdmin",
            columnDef: {
              cell: cellFunc<boolean>((adm) => <span class="w-full text-center">{adm ? "💪🏽" : ""}</span>),
              size: 130,
            },
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
                <Button onClick={() => UserEditForm.showModalFor({userId: c.row.getValue("id")})}>
                  <FiEdit2 class="inlineIcon strokeIcon text-current" /> {t("actions.edit")}
                </Button>
              ),
              enableSorting: false,
              ...AUTO_SIZE_COLUMN_DEFS,
            },
          },
        ]}
        initialSort={[{id: "name", desc: false}]}
        customSectionBelowTable={
          <div class="ml-2 flex gap-1">
            <Button class="secondarySmall" onClick={() => UserCreateForm.showModal()}>
              <TbUserPlus class="inlineIcon strokeIcon text-current" /> {t("actions.add_user")}
            </Button>
          </div>
        }
      />
      <UserEditForm.UserEditModal />
      <UserCreateForm.UserCreateModal />
    </>
  );
}) satisfies VoidComponent;
