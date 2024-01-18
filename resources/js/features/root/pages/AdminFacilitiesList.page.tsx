import {Button, EditButton} from "components/ui/Button";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FACILITY_ICONS} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityCreateModal, showFacilityCreateModal} from "features/facility-edit/FacilityCreateModal";
import {FacilityEditModal, showFacilityEditModal} from "features/facility-edit/FacilityEditModal";
import {Component} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.facility()}
        staticEntityURL="admin/facility"
        staticTranslations={createTableTranslations("facility")}
        staticPersistenceKey="adminFacilities"
        columns={[
          {name: "id", initialVisible: false},
          {name: "name", columnDef: {enableHiding: false}},
          {name: "url", columnDef: {cell: cellFunc<string>((url) => <PaddedCell>/{url}</PaddedCell>)}},
          {name: "createdAt", columnDef: {sortDescFirst: true}},
          {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
          {
            name: "actions",
            isDataColumn: false,
            extraDataColumns: ["id"],
            columnDef: {
              cell: (c) => (
                <PaddedCell>
                  <EditButton onClick={() => showFacilityEditModal({facilityId: c.row.getValue("id")})} />
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
            <Button class="secondary small" onClick={() => showFacilityCreateModal()}>
              <FACILITY_ICONS.add class="inlineIcon text-current" /> {t("actions.add_facility")}
            </Button>
          </div>
        }
      />
      <FacilityCreateModal />
      <FacilityEditModal />
    </>
  );
}) satisfies Component;
