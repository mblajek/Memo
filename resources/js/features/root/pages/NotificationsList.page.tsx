import {createHistoryPersistence} from "components/persistence/history_persistence";
import {Capitalize} from "components/ui/Capitalize";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {InfoIcon} from "components/ui/InfoIcon";
import {createTableTranslations} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {exportCellFunc, TextExportedCell} from "components/ui/Table/table_export_cells";
import {useTable} from "components/ui/Table/TableContext";
import {UuidSelectFilterControl} from "components/ui/Table/tquery_filters/UuidSelectFilterControl";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {Tabs} from "components/ui/Tabs";
import {useLangFunc} from "components/utils/lang";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {currentTimeMinute} from "components/utils/time";
import {FacilityNotification} from "data-access/memo-api/groups/FacilityNotification";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {dateTimeToISO} from "data-access/memo-api/utils";
import {UserLink} from "features/facility-users/UserLink";
import {useMeetingTableColumns} from "features/meeting/meeting_tables";
import {createComputed, createSignal, on, Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

const DEFAULT_MEETING_SMS_TEMPLATE = "{{meeting_facility_template_subject}}";

const MODES = ["all", "future", "past"];
type Mode = (typeof MODES)[number];

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const modelQuerySpecs = useModelQuerySpecs();
  const cols = useMeetingTableColumns();
  const [mode, setMode] = createSignal<Mode>("all");
  createHistoryPersistence({
    key: "NotificationsList",
    value: () => ({mode: mode()}),
    onLoad: (value) => {
      setMode(value.mode);
    },
  });
  const defaultScheduledAtDesc = () => mode() !== "future";

  const Header: VoidComponent = () => {
    const table = useTable();
    createComputed(
      on(mode, () => {
        table.setSorting(
          table
            .getState()
            .sorting.map((sort) => (sort.id === "scheduledAt" ? {...sort, desc: defaultScheduledAtDesc()} : sort)),
        );
      }),
    );
    return (
      <Tabs
        tabs={MODES.map((mode) => ({
          id: mode,
          label: <Capitalize class="mx-2" text={t(`tables.tables.notification.mode.${mode}`)} />,
        }))}
        activeTab={mode()}
        onActiveTabChange={setMode}
      />
    );
  };

  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityNotification.keys.notification()}
      staticEntityURL={`facility/${activeFacilityId()}/notification`}
      staticTranslations={createTableTranslations("notification")}
      staticPersistenceKey="facilityNotifications"
      intrinsicSort={[{type: "column", column: "scheduledAt", desc: defaultScheduledAtDesc()}]}
      intrinsicFilter={
        mode() === "all"
          ? undefined
          : {
              type: "column",
              column: "scheduledAt",
              op: mode() === "past" ? "<=" : ">=",
              val: dateTimeToISO(currentTimeMinute()),
            }
      }
      columns={[
        {name: "id", initialVisible: false},
        {name: "scheduledAt"},
        {name: "service", columnDef: {size: 100}, initialVisible: false},
        {name: "status", columnDef: {size: 150}, columnGroups: true},
        {name: "errorMessage"},
        {
          name: "user.id",
          extraDataColumns: ["user.name"],
          columnDef: {
            cell: cellFunc<string>((props) => (
              <PaddedCell>
                <ShowCellVal v={props.v}>
                  {(v) => <UserLink userId={v()} userName={props.row["user.name"] as string} />}
                </ShowCellVal>
              </PaddedCell>
            )),
            size: 250,
          },
          filterControl: (props) => <UuidSelectFilterControl {...props} {...modelQuerySpecs.userClient()} />,
          columnGroups: true,
          metaParams: {
            textExportCell: exportCellFunc<TextExportedCell, string>((v, ctx) => ctx.row["user.name"] as string),
          },
        },
        {
          name: "address",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <PaddedCell>
                <ShowCellVal
                  v={props.v}
                  fallback={
                    <div class="text-grey-text flex gap-1 justify-between">
                      <EmptyValueSymbol /> <InfoIcon title={t("tables.tables.notification.no_address_hint")} />
                    </div>
                  }
                >
                  {(v) => v()}
                </ShowCellVal>
              </PaddedCell>
            )),
            size: 150,
          },
        },
        {
          name: "subject",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <PaddedCell>
                <ShowCellVal
                  v={props.v}
                  fallback={
                    <div class="text-grey-text flex gap-1 justify-between">
                      <EmptyValueSymbol />
                      <InfoIcon title={t("tables.tables.notification.no_address_hint")} />
                    </div>
                  }
                >
                  {(v) => (
                    <Show
                      when={v() !== DEFAULT_MEETING_SMS_TEMPLATE}
                      fallback={
                        <div class="text-grey-text flex gap-1 justify-between">
                          {t("tables.tables.notification.default_subject")}
                          <InfoIcon title={t("tables.tables.notification.default_subject_hint", {text: v()})} />
                        </div>
                      }
                    >
                      {v()}
                    </Show>
                  )}
                </ShowCellVal>
              </PaddedCell>
            )),
            size: 300,
          },
        },
        cols.foreign.meetingId,
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "scheduledAt", desc: defaultScheduledAtDesc()}]}
      savedViews
      header={<Header />}
    />
  );
}) satisfies VoidComponent;
