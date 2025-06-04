import {Button, EditButton} from "components/ui/Button";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AUTO_SIZE_COLUMN_DEFS, createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {facilityIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils/lang";
import {Admin} from "data-access/memo-api/groups/Admin";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {createFacilityCreateModal} from "features/facility-edit/facility_create_modal";
import {createFacilityEditModal} from "features/facility-edit/facility_edit_modal";
import {Component} from "solid-js";

export default (() => {
  const t = useLangFunc();
  const facilityCreateModal = createFacilityCreateModal();
  const facilityEditModal = createFacilityEditModal();
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={Admin.keys.facility()}
      staticEntityURL="admin/facility"
      staticTranslations={createTableTranslations("facility")}
      staticPersistenceKey="adminFacilities"
      columns={[
        {name: "id", initialVisible: false},
        {name: "name", columnDef: {enableHiding: false}},
        {
          name: "url",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <PaddedCell>
                <ShowCellVal v={props.v}>
                  <span class="text-gray-400">/</span>
                  {props.v}
                </ShowCellVal>
              </PaddedCell>
            )),
          },
        },
        {name: "facilityAdmins.*.name"},
        {name: "meetingNotificationTemplateSubject", initialVisible: false},
        ...getCreatedUpdatedColumns({globalAdmin: true}),
        {
          name: "actions",
          isDataColumn: false,
          extraDataColumns: ["id"],
          columnDef: {
            cell: (c) => (
              <PaddedCell>
                <EditButton
                  class="minimal -my-px"
                  onClick={() => facilityEditModal.show({facilityId: c.row.original.id as string})}
                />
              </PaddedCell>
            ),
            enableSorting: false,
            enableHiding: false,
            ...AUTO_SIZE_COLUMN_DEFS,
          },
        },
      ]}
      initialSort={[{id: "name", desc: false}]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <Button class="secondary small" onClick={() => facilityCreateModal.show()}>
            <facilityIcons.Add class="inlineIcon" /> {t("actions.facility.add")}
          </Button>
        </div>
      }
    />
  );
}) satisfies Component;
