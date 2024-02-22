import {Capitalize} from "components/ui/Capitalize";
import {BigSpinner} from "components/ui/Spinner";
import {TableExportConfig, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {Tabs} from "components/ui/Tabs";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {getCreatedUpdatedColumns} from "data-access/memo-api/tquery/table_columns";
import {Sort} from "data-access/memo-api/tquery/types";
import {FacilityUserType, useUserDisplayNames} from "data-access/memo-api/user_display_names";
import {ParentComponent, Show, VoidComponent, createComputed, createSignal} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {useMeetingTableColumns, useMeetingTableFilters} from "../meeting/meeting_tables";

interface Props {
  readonly userName: string;
  readonly userType: FacilityUserType;
  readonly intrinsicFilter: FilterH;
  readonly staticPersistenceKey?: string;
}

export const UserMeetingsTables: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {dictionaries, meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  const userDisplayNames = useUserDisplayNames();
  const entityURL = () => `facility/${activeFacilityId()}/meeting/attendant`;
  const meetingTableColumns = useMeetingTableColumns();
  const meetingTableFilters = useMeetingTableFilters();
  const intrinsicFilter = (): FilterH => ({
    type: "op",
    op: "&",
    val: [meetingTableFilters.isRegularMeeting()!, props.intrinsicFilter],
  });
  function sortByDate({desc}: {desc: boolean}) {
    return [
      {type: "column", column: "date", desc},
      {type: "column", column: "startDayminute", desc},
    ] satisfies Sort;
  }
  const tableTranslations = createTableTranslations("meeting");
  function exportConfig(tableType: "planned" | "completed" | "all"): TableExportConfig {
    const baseName =
      tableType === "all" ? tableTranslations.tableName() : t(`facility_user.meetings_lists.${tableType}`);
    const userName = `${props.userName.replaceAll(" ", "_")}_(${userDisplayNames.getTypeName(props.userType)})`;
    return {
      tableName: `${baseName}__${userName}`,
    };
  }
  return (
    <div>
      <Show when={dictionaries()} fallback={<BigSpinner />}>
        <Capitalize class="font-medium" text={tableTranslations.tableName()} />
        <Tabs
          tabs={[
            {
              id: "planned",
              label: <Capitalize text={t("facility_user.meetings_lists.planned")} />,
              contents: (active) => (
                <ShowOnceShown when={active()}>
                  <div class="text-sm">
                    <TQueryTable
                      mode="embedded"
                      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                      staticEntityURL={entityURL()}
                      staticTranslations={tableTranslations}
                      staticPersistenceKey={`${props.staticPersistenceKey}.planned`}
                      staticTableId="planned"
                      intrinsicFilter={{
                        type: "op",
                        op: "&",
                        val: [
                          intrinsicFilter(),
                          {
                            type: "column",
                            column: "statusDictId",
                            op: "=",
                            val: meetingStatusDict()!.planned.id,
                          },
                          {
                            type: "column",
                            column: "attendant.attendanceStatusDictId",
                            op: "in",
                            val: [attendanceStatusDict()!.ok.id, attendanceStatusDict()!.late_present.id],
                          },
                        ],
                      }}
                      intrinsicSort={sortByDate({desc: false})}
                      columns={[
                        ...meetingTableColumns.get(
                          "id",
                          "dateTimeActions",
                          ["time", {initialVisible: false}],
                          ["duration", {initialVisible: false}],
                          ["isInSeries", {initialVisible: false}],
                          "category",
                          "type",
                          "statusTags",
                          ["attendanceStatus", {initialVisible: false}],
                          "attendants",
                          "attendantsAttendance",
                          ["staff", {initialVisible: false}],
                          "staffAttendance",
                          ["clients", {initialVisible: false}],
                          "clientsAttendance",
                          ["isRemote", {initialVisible: false}],
                          "notes",
                          "resources",
                        ),
                        ...getCreatedUpdatedColumns(),
                      ]}
                      initialSort={[{id: "date", desc: false}]}
                      exportConfig={exportConfig("planned")}
                    />
                  </div>
                </ShowOnceShown>
              ),
            },
            {
              id: "completed",
              label: <Capitalize text={t("facility_user.meetings_lists.completed")} />,
              contents: (active) => (
                <ShowOnceShown when={active()}>
                  <div class="text-sm">
                    <TQueryTable
                      mode="embedded"
                      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                      staticEntityURL={entityURL()}
                      staticTranslations={tableTranslations}
                      staticPersistenceKey={`${props.staticPersistenceKey}.completed`}
                      staticTableId="completed"
                      intrinsicFilter={{
                        type: "op",
                        op: "&",
                        val: [
                          intrinsicFilter(),
                          {
                            type: "column",
                            column: "statusDictId",
                            op: "=",
                            val: meetingStatusDict()!.completed.id,
                          },
                          {
                            type: "column",
                            column: "attendant.attendanceStatusDictId",
                            op: "in",
                            val: [attendanceStatusDict()!.ok.id, attendanceStatusDict()!.late_present.id],
                          },
                        ],
                      }}
                      intrinsicSort={sortByDate({desc: true})}
                      columns={[
                        ...meetingTableColumns.get(
                          "id",
                          ["dateTimeActions", {columnDef: {sortDescFirst: true}}],
                          ["time", {initialVisible: false}],
                          ["duration", {initialVisible: false}],
                          ["isInSeries", {initialVisible: false}],
                          "category",
                          "type",
                          "statusTags",
                          ["attendanceStatus", {initialVisible: false}],
                          "attendants",
                          "attendantsAttendance",
                          ["staff", {initialVisible: false}],
                          "staffAttendance",
                          ["clients", {initialVisible: false}],
                          "clientsAttendance",
                          ["isRemote", {initialVisible: false}],
                          "notes",
                          "resources",
                        ),
                        ...getCreatedUpdatedColumns(),
                      ]}
                      initialSort={[{id: "date", desc: true}]}
                      exportConfig={exportConfig("completed")}
                    />
                  </div>
                </ShowOnceShown>
              ),
            },
            {
              id: "all",
              label: <Capitalize text={t("facility_user.meetings_lists.all")} />,
              contents: (active) => (
                <ShowOnceShown when={active()}>
                  <div class="text-sm">
                    <TQueryTable
                      mode="embedded"
                      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                      staticEntityURL={entityURL()}
                      staticTranslations={tableTranslations}
                      staticPersistenceKey={`${props.staticPersistenceKey}.all`}
                      staticTableId="all"
                      intrinsicFilter={intrinsicFilter()}
                      intrinsicSort={sortByDate({desc: true})}
                      columns={[
                        ...meetingTableColumns.get(
                          "id",
                          ["dateTimeActions", {columnDef: {sortDescFirst: true}}],
                          ["time", {initialVisible: false}],
                          ["duration", {initialVisible: false}],
                          ["isInSeries", {initialVisible: false}],
                          "category",
                          "type",
                          "statusTags",
                          "attendanceStatus",
                          "attendants",
                          "attendantsAttendance",
                          ["staff", {initialVisible: false}],
                          "staffAttendance",
                          ["clients", {initialVisible: false}],
                          "clientsAttendance",
                          ["isRemote", {initialVisible: false}],
                          "notes",
                          "resources",
                        ),
                        ...getCreatedUpdatedColumns(),
                      ]}
                      initialSort={[{id: "date", desc: true}]}
                      exportConfig={exportConfig("all")}
                    />
                  </div>
                </ShowOnceShown>
              ),
            },
          ]}
        />
      </Show>
    </div>
  );
};

const ShowOnceShown: ParentComponent<{when: boolean}> = (props) => {
  const [shown, setShown] = createSignal(false);
  createComputed(() => {
    if (props.when) {
      setShown(true);
    }
  });
  return <Show when={shown()}>{props.children}</Show>;
};
