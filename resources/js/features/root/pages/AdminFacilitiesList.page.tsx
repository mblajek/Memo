import { A } from "@solidjs/router";
import {AUTO_SIZE_COLUMN_DEFS, createTableTranslations} from "components/ui";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AccessBarrier, useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {Component} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <AccessBarrier roles={["globalAdmin"]}>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={Admin.keys.facilityLists()}
        staticEntityURL="admin/facility"
        staticTranslations={createTableTranslations("facilities")}
        intrinsicColumns={["id", "url"]}
        additionalColumns={["actions"]}
        columnOptions={{
          name: {
            metaParams: {canControlVisibility: false},
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
              cell: (c) => {
                return <A href={`/${c.row.getValue("url")}`}>{t("models.facility.page")}</A>
              },
              ...AUTO_SIZE_COLUMN_DEFS,
            },
          },
        }}
        initialColumnsOrder={[
          "id",
          "name",
          "createdAt",
        ]}
        initialVisibleColumns={[
          "name",
          "createdAt",
          "actions",
        ]}
        initialSort={[{id: "name", desc: false}]}
      />
    </AccessBarrier>
  );
}) satisfies Component;