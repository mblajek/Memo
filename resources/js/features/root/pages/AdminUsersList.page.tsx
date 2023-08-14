import {Email} from "components/ui";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AccessBarrier} from "components/utils";
import {Component} from "solid-js";

import {startUsersMock} from "./users_fake_tquery";

export default (() => {
  startUsersMock();
  return (
    <AccessBarrier roles={["globalAdmin"]}>
      <TQueryTable
        mode="standalone"
        staticEntityURL="entityURL"
        translations="tables.tables.users"
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
              cell: (c) => (c.getValue() ? "💪🏽" : ""),
            },
          },
          actions: {
            columnDef: {
              cell: (c) => <button>Weź usuń {c.row.getValue("name")}</button>,
            },
            metaParams: {canControlVisibility: false},
          },
        }}
        initialVisibleColumns={["name", "createdAt", "actions"]}
        initialSort={[{id: "name", desc: false}]}
      />
    </AccessBarrier>
  );
}) satisfies Component;
