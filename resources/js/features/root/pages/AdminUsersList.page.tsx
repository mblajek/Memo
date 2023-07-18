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
      columnOptions={{
        email: {
          columnDef: {
            cell: c => <Email email={c.getValue() as string} />,
          },
        },
        hasGlobalAdmin: {
          columnDef: {
            cell: c => c.getValue() ? "💪🏽" : "",
          },
        },
      }}
      initialPageSize={10}
    />
  </AccessBarrier>;
}) satisfies Component;
