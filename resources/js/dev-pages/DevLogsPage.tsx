import {VoidComponent} from "solid-js";
import {cellFunc, createTableTranslations, ShowCellVal} from "../components/ui/Table";
import {TQueryTable} from "../components/ui/Table/TQueryTable";
import {ScrollableCell} from "../data-access/memo-api/tquery/table_columns";

const BASE_HEIGHT = "5rem";

export default (() => {
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={["admin", "developer", "log"]}
      staticEntityURL="admin/developer/log"
      staticPersistenceKey="developerLogs"
      staticTranslations={createTableTranslations("logs")}
      columns={[
        {name: "id", initialVisible: false},
        {name: "createdAtDate", initialVisible: false, columnGroups: true},
        {name: "createdAt"},
        {name: "source", columnDef: {size: 150}, columnGroups: true},
        {name: "logLevel", columnDef: {size: 150}, columnGroups: true},
        {
          name: "message",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <ScrollableCell class="font-mono text-sm whitespace-pre-wrap" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>{(v) => v()}</ShowCellVal>
              </ScrollableCell>
            )),
            size: 500,
          },
          columnGroups: true,
        },
        {
          name: "context",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <ScrollableCell class="font-mono text-xs whitespace-pre-wrap" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>{(v) => v()}</ShowCellVal>
              </ScrollableCell>
            )),
            size: 500,
          },
        },
        {name: "appVersion", columnDef: {size: 150}, columnGroups: true},
        {name: "clientIp", columnDef: {size: 150}, initialVisible: false, columnGroups: true},
        {
          name: "userAgent",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <ScrollableCell baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>{(v) => v()}</ShowCellVal>
              </ScrollableCell>
            )),
          },
          initialVisible: false,
          columnGroups: true,
        },
        {name: "user.id", columnDef: {size: 150}, initialVisible: false, columnGroups: "user.name"},
        {name: "user.name", columnGroups: true},
      ]}
      initialSort={[{id: "createdAt", desc: true}]}
      intrinsicSort={[
        {type: "column", column: "createdAt", desc: true},
        {type: "column", column: "createdAtDate", desc: true},
      ]}
    />
  );
}) satisfies VoidComponent;
