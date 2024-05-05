import {Button, EditButton} from "components/ui/Button";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, ShowCellVal, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {exportCellFunc} from "components/ui/Table/table_export_cells";
import {FACILITY_ICONS} from "components/ui/icons";
import {useLangFunc} from "components/utils";
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
          metaParams: {
            textExportCell: exportCellFunc((v: string) => `/${v}`),
          },
        },
        ...getCreatedUpdatedColumns({includeCreatedBy: false, includeUpdatedBy: false, globalAdmin: true}),
        {
          name: "actions",
          isDataColumn: false,
          extraDataColumns: ["id"],
          columnDef: {
            cell: (c) => (
              <PaddedCell>
                <EditButton
                  class="minimal"
                  onClick={() => facilityEditModal.show({facilityId: c.row.original.id as string})}
                />
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
          <Button class="secondary small" onClick={() => facilityCreateModal.show()}>
            <FACILITY_ICONS.add class="inlineIcon text-current" /> {t("actions.facility.add")}
          </Button>
        </div>
      }
    />
  );
}) satisfies Component;
