import {Button, Email, createTableTranslations, css} from "components/ui";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AccessBarrier, useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {UserEditForm} from "features/users-edit";
import {FiEdit2} from "solid-icons/fi";
import {Component} from "solid-js";
import {startUsersMock} from "./users_fake_tquery";

export default (() => {
  startUsersMock();
  const t = useLangFunc();
  return (
    <AccessBarrier roles={["globalAdmin"]}>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.userLists()}
        staticEntityURL="entityURL"
        staticTranslations={createTableTranslations("users")}
        intrinsicColumns={["id"]}
        additionalColumns={["actions"]}
        columnOptions={{
          id: {
            metaParams: {canControlVisibility: false},
          },
          name: {
            metaParams: {canControlVisibility: false},
          },
          email: {
            columnDef: {
              cell: (c) => <Email email={c.getValue() as string} />,
            },
          },
          hasPassword: {
            columnDef: {
              size: 100,
            },
          },
          createdAt: {
            columnDef: {
              sortDescFirst: true,
            },
            metaParams: {
              filtering: {
                useDateOnlyInputs: true,
              },
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
                  <FiEdit2 class={css.inlineStrokeIcon} /> {t("edit")}
                </Button>
              ),
            },
          },
        }}
        initialColumnsOrder={[
          "name",
          "email",
          "hasPassword",
          "createdAt",
          "facilitiesMember",
          "numFacilities",
          "hasGlobalAdmin",
        ]}
        initialVisibleColumns={[
          "name",
          "email",
          "hasPassword",
          "createdAt",
          "facilitiesMember",
          "hasGlobalAdmin",
          "actions",
        ]}
        initialSort={[{id: "name", desc: false}]}
      />
      <UserEditForm.Modal />
    </AccessBarrier>
  );
}) satisfies Component;
