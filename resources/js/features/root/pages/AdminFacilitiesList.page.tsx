import {A} from "@solidjs/router";
import {Button, createTableTranslations} from "components/ui";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityCreateModal, showFacilityCreateModal} from "features/facility-edit/FacilityCreateModal";
import {BsHouseAdd} from "solid-icons/bs";
import {Component} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.facilityLists()}
        staticEntityURL="admin/facility"
        staticTranslations={createTableTranslations("facilities")}
        intrinsicColumns={["id"]}
        initialColumnsOrder={["id", "name", "url", "createdAt", "updatedAt"]}
        initialVisibleColumns={["name", "url", "createdAt"]}
        initialSort={[{id: "name", desc: false}]}
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
    </>
  );
}) satisfies Component;
