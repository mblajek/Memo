import {A} from "@solidjs/router";
import {AUTO_SIZE_COLUMN_DEFS, Button, createTableTranslations} from "components/ui";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityCreateModal, showFacilityCreateModal} from "features/facility-edit/FacilityCreateModal";
import {FacilityEditModal, showFacilityEditModal} from "features/facility-edit/FacilityEditModal";
import {BsHouseAdd} from "solid-icons/bs";
import {FiEdit2} from "solid-icons/fi";
import {Component} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.facility()}
        staticEntityURL="admin/facility"
        staticTranslations={createTableTranslations("facilities")}
        intrinsicColumns={["id"]}
        initialColumnsOrder={["id", "name", "url", "createdAt", "updatedAt"]}
        initialVisibleColumns={["name", "url", "createdAt", "actions"]}
        initialSort={[{id: "name", desc: false}]}
        additionalColumns={["actions"]}
        columnOptions={{
          name: {
            metaParams: {canControlVisibility: false},
          },
          url: {
            columnDef: {
              cell: (c) => {
                const href = () => `/${c.getValue()}`;
                // TODO: The link can be inaccessible for the current user, handle this better.
                return <A href={href()}>{href()}</A>;
              },
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
          updatedAt: {
            columnDef: {
              sortDescFirst: true,
            },
            metaParams: {
              filtering: {
                useDateOnlyInputs: true,
              },
            },
          },
          actions: {
            columnDef: {
              cell: (c) => (
                <Button onClick={() => showFacilityEditModal({facilityId: c.row.getValue("id")})}>
                  <FiEdit2 class="inlineIcon strokeIcon text-current" /> {t("actions.edit")}
                </Button>
              ),
              enableSorting: false,
              ...AUTO_SIZE_COLUMN_DEFS,
            },
          },
        }}
        customSectionBelowTable={
          <div class="ml-2 flex gap-1">
            <Button class="secondarySmall" onClick={() => showFacilityCreateModal()}>
              <BsHouseAdd class="inlineIcon text-current" /> {t("actions.add_facility")}
            </Button>
          </div>
        }
      />
      <FacilityCreateModal />
      <FacilityEditModal />
    </>
  );
}) satisfies Component;
