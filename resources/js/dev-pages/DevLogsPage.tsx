import bowser from "bowser";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, ShowCellVal} from "components/ui/Table/table_cells";
import {useLangFunc} from "components/utils/lang";
import {System} from "data-access/memo-api/groups/System";
import {FaSolidTerminal} from "solid-icons/fa";
import {Show, VoidComponent} from "solid-js";
import {CopyToClipboard} from "../components/ui/CopyToClipboard";
import {IconButton} from "../components/ui/IconButton";
import {TQueryTable} from "../components/ui/Table/TQueryTable";
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
          extraDataColumns: ["source"],
          columnDef: {
            cell: cellFunc<string>((props) => (
              <ScrollableCell class="pr-0 text-sm whitespace-pre-wrap" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>
                  {(v) => (
                    <LogText
                      text={v()}
                      printToConsoleButton={props.row.source === System.LogAPIFrontendSource.JS_ERROR}
                    />
                  )}
                </ShowCellVal>
              </ScrollableCell>
            )),
            size: 500,
          },
          columnGroups: [true, "context"],
        },
        {
          name: "context",
          extraDataColumns: ["source"],
          columnDef: {
            cell: cellFunc<string>((props) => (
              <ScrollableCell class="pr-0 text-xs whitespace-pre-wrap" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>
                  {(v) => (
                    <LogText
                      text={v()}
                      printToConsoleButton={props.row.source === System.LogAPIFrontendSource.JS_ERROR}
                    />
                  )}
                </ShowCellVal>
              </ScrollableCell>
            )),
            size: 500,
          },
          columnGroups: true,
        },
        {name: "appVersion", columnDef: {size: 150}, columnGroups: true},
        {name: "clientIp", columnDef: {size: 150}, initialVisible: false, columnGroups: true},
        {
          name: "userAgent",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <ScrollableCell class="pr-0 text-xs" baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.v}>{(v) => <LogText text={v()} />}</ShowCellVal>
              </ScrollableCell>
            )),
          },
          columnGroups: true,
          initialVisible: false,
        },
        {
          name: "userAgentSummary",
          isDataColumn: false,
          extraDataColumns: ["userAgent"],
          columnDef: {
            cell: cellFunc<string>((props) => (
              <ScrollableCell baseHeight={BASE_HEIGHT}>
                <ShowCellVal v={props.row.userAgent as string | null}>{(v) => <>{browserSummary(v())}</>}</ShowCellVal>
              </ScrollableCell>
            )),
          },
          columnGroups: "userAgent",
        },
        {name: "user.id", columnDef: {size: 150}, initialVisible: false, columnGroups: "user.name"},
        {name: "user.name", columnGroups: true},
      ]}
      initialSort={[{id: "createdAt", desc: true}]}
      intrinsicSort={[
        {type: "column", column: "createdAt", desc: true},
        {type: "column", column: "createdAtDate", desc: true},
      ]}
      savedViews
    />
  );
}) satisfies VoidComponent;

function browserSummary(userAgent: string) {
  const {browser, os, platform, engine} = bowser.parse(userAgent);
  function majorVer(version: string | undefined) {
    return version?.split(".")[0];
  }
  function joinElems(elems: (string | undefined)[]) {
    return elems.filter(Boolean).join(" ");
  }
  const eng = joinElems([engine.name, majorVer(engine.version)]);
  return (
    <div>
      {[joinElems([platform.type, platform.vendor, platform.model]), joinElems([os.name, majorVer(os.version)])]
        .filter(Boolean)
        .join(", ")}
      <br />
      {joinElems([browser.name, majorVer(browser.version)])}
      {eng ? ` (${eng})` : ""}
    </div>
  );
}

interface LogTextProps {
  readonly text: string;
  readonly printToConsoleButton?: boolean;
}

const LogText: VoidComponent<LogTextProps> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex gap-1 font-mono">
      <div class="basis-0 min-w-0 grow">{props.text}</div>
      <div class="px-0.5 flex flex-col text-base">
        <CopyToClipboard class="bg-white rounded" text={props.text} />
        <Show when={props.printToConsoleButton}>
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
