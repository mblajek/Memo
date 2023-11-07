import {Button} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {AUTO_SIZE_COLUMN_DEFS, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups";
import {UserCreateForm, UserEditForm} from "features/users-edit";
import {FiEdit2} from "solid-icons/fi";
import {TbUserPlus} from "solid-icons/tb";
import {VoidComponent} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.user()}
        staticEntityURL="admin/user"
        staticTranslations={createTableTranslations("users")}
        intrinsicColumns={["id"]}
        additionalColumns={["actions"]}
        ignoreColumns={["lastLoginFacility.id", "lastLoginFacility.name", "createdBy.id"]}
        columnOptions={{
          name: {
            metaParams: {canControlVisibility: false},
          },
          email: {
            columnDef: {
              cell: cellFunc<string>((v) => <Email class="w-full" email={v} />),
            },
          },
          createdAt: {
            columnDef: {
              sortDescFirst: true,
            },
          },
          updatedAt: {
            columnDef: {
              sortDescFirst: true,
            },
          },
          hasGlobalAdmin: {
            columnDef: {
              cell: (c) => <span class="w-full text-center">{c.getValue() ? "💪🏽" : ""}</span>,
              size: 130,
            },
          },
          actions: {
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
        }}
        initialColumnsOrder={[
          "id",
          "name",
          "email",
          "hasEmailVerified",
          "hasPassword",
          "passwordExpireAt",
          "facilityCount",
          "hasGlobalAdmin",
          "createdAt",
          "createdBy.name",
          "updatedAt",
          "actions",
        ]}
        initialVisibleColumns={["name", "email", "hasPassword", "createdAt", "hasGlobalAdmin", "actions"]}
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
