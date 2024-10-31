import {FaSolidTerminal} from "solid-icons/fa";
import {Show, VoidComponent} from "solid-js";
import {CopyToClipboard} from "../components/ui/CopyToClipboard";
import {IconButton} from "../components/ui/IconButton";
import {cellFunc, createTableTranslations, ShowCellVal} from "../components/ui/Table";
import {TQueryTable} from "../components/ui/Table/TQueryTable";
import {useLangFunc} from "../components/utils";
import {ScrollableCell} from "../data-access/memo-api/tquery/table_columns";

const BASE_HEIGHT = "6rem";

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
              <ScrollableCell class="pr-0 font-mono text-sm whitespace-pre-wrap" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>{(v) => <LogText text={v()} printToConsoleButton />}</ShowCellVal>
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
              <ScrollableCell class="pr-0 font-mono text-xs whitespace-pre-wrap" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>{(v) => <LogText text={v()} printToConsoleButton />}</ShowCellVal>
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
              <ScrollableCell class="pr-0" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>{(v) => <LogText text={v()} />}</ShowCellVal>
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

interface LogTextProps {
  readonly text: string;
  readonly printToConsoleButton?: boolean;
}

const LogText: VoidComponent<LogTextProps> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex gap-1">
      <div class="basis-0 min-w-0 grow">{props.text}</div>
      <div class="px-0.5 flex flex-col text-base">
        <CopyToClipboard class="bg-white rounded" text={props.text} />
        <Show when={props.printToConsoleButton && props.text.match(/\n(\t| {2,})at /)}>
          <IconButton
            class="bg-white rounded"
            icon={FaSolidTerminal}
            title={t("dev.print_error_to_console")}
            onClick={() => console.warn(props.text)}
          />
        </Show>
      </div>
    </div>
  );
};
