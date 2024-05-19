import {Button, EditButton} from "components/ui/Button";
import {Email} from "components/ui/Email";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, ShowCellVal, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {USER_ICONS} from "components/ui/icons";
import {EmptyValueSymbol} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups";
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
        {name: "facilities.count", initialVisible: false},
        {
          name: "hasGlobalAdmin",
          columnDef: {size: 130},
        },
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
