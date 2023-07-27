import {TQueryTable} from "components/ui/Table/TQueryTable";
import {AccessBarrier} from "components/utils";
import {Component} from "solid-js";
import {Email} from "components/ui";

import {startUsersMock} from "./users_fake_tquery";

export default (() => {
  startUsersMock();
  return <AccessBarrier roles={["globalAdmin"]}>
    <TQueryTable
      staticEntityURL="entityURL"
      translations="tables.tables.users"
      additionalColumns={["actions"]}
      columnOptions={{
        email: {
          columnDef: {
            cell: c => <Email email={c.getValue() as string} />,
          },
        },
        createdAt: {
          columnDef: {
            sortDescFirst: true,
          },
        },
        hasGlobalAdmin: {
          columnDef: {
            cell: c => c.getValue() ? "💪🏽" : "",
          },
        },
        actions: {
          columnDef: {
            cell: c => <button>Weź usuń {c.row.getValue("name")}</button>,
          },
        },
      }}
      initialVisibleColumns={["name", "createdAt", "actions"]}
      initialPageSize={10}
    />
  </AccessBarrier>;
}) satisfies Component;
