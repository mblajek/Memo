import {createHistoryPersistence} from "components/persistence/history_persistence";
import {Capitalize} from "components/ui/Capitalize";
import {BigSpinner} from "components/ui/Spinner";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {createTableTranslations, TableExportConfig} from "components/ui/Table/Table";
import {Tabs} from "components/ui/Tabs";
import {EM_DASH} from "components/ui/symbols";
import {Recreator} from "components/utils/Recreator";
import {DATE_FORMAT} from "components/utils/formatting";
import {useLangFunc} from "components/utils/lang";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FilterH, FilterReductor} from "data-access/memo-api/tquery/filter_utils";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {Sort} from "data-access/memo-api/tquery/types";
import {Accessor, createComputed, createSignal, ParentComponent, Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {useAttendanceStatusesInfo} from "../meeting/attendance_status_info";
import {useMeetingTableColumns, useMeetingTableFilters} from "../meeting/meeting_tables";
import {UserMeetingsStats} from "./user_meetings_stats";
import {FacilityUserType, getFacilityUserTypeName} from "./user_types";

type TableType = "planned" | "completed" | "all";

export function useUserMeetingsTables() {
  const t = useLangFunc();
  const {dictionaries, meetingStatusDict} = useFixedDictionaries();
  const {presenceStatuses} = useAttendanceStatusesInfo();
  const cols = useMeetingTableColumns({baseHeight: "3.5rem"});
  const meetingTableFilters = useMeetingTableFilters();
  const {getCreatedUpdatedColumns} = useTableColumns();
  function sortByDate({desc}: {desc: boolean}) {
    return [
      {type: "column", column: "date", desc},
      {type: "column", column: "startDayminute", desc},
    ] satisfies Sort;
  }

  interface UserMeetingsTablesProps {
    readonly staticUserName: string;
    readonly staticUserType: FacilityUserType;
    /** Whether the tables should show attendances grouped by meeting, because they are attendances for multiple people. */
    readonly clientGroupMeetings?: boolean;
    readonly intrinsicFilter: FilterH;
    readonly staticPersistenceKey?: string;
    readonly userMeetingsStats?: UserMeetingsStats;
  }

  const UserMeetingsTables: VoidComponent<UserMeetingsTablesProps> = (props) => {
    const entityURL = () => `facility/${activeFacilityId()}/meeting/attendant`;
    const intrinsicFilter = (): FilterH => ({
      type: "op",
      op: "&",
      val: [meetingTableFilters.isRegularMeeting() || "never", props.intrinsicFilter],
    });
    const tableTranslations = () =>
      createTableTranslations([
        props.clientGroupMeetings ? "meeting_multiple_attendants" : "meeting_single_attendant",
        "meeting_attendant",
        "meeting",
      ]);
    function exportConfig(tableType: TableType): TableExportConfig {
      const baseName =
        tableType === "all" ? tableTranslations().tableName() : t(`facility_user.meetings_lists.${tableType}`);
      const userName = `${props.staticUserName.replaceAll(" ", "_")}_(${
        props.clientGroupMeetings ? t("models.client_group._name") : getFacilityUserTypeName(t, props.staticUserType)
      })`;
      return {
        tableName: `${baseName}__${userName}`,
      };
    }
    const [activeTab, setActiveTab] = createSignal<string>();
    createHistoryPersistence({
      key: "userMeetingsTables",
      value: () => ({activeTab: activeTab()}),
      onLoad: (state) => {
        setActiveTab(state.activeTab);
      },
    });
    function getPersistenceKey(tableType: TableType) {
      return props.staticPersistenceKey
        ? `${props.staticPersistenceKey}.${tableType}${props.clientGroupMeetings ? ".client_group" : ""}`
        : undefined;
    }
    return (
      <Show when={dictionaries()} fallback={<BigSpinner />}>
        <div class="flex flex-col">
          <Tabs
            tabs={[
              {
                id: "planned",
                label: (
                  <div class="min-w-48 h-full flex flex-col items-center justify-center">
                    <span>
                      <Capitalize text={t("facility_user.meetings_lists.planned")} />
                      <Show when={props.userMeetingsStats}>
                        {(stats) => (
                          <span class="text-grey-text">
                            {" "}
                            {EM_DASH} {stats().plannedMeetingsCount}
                          </span>
                        )}
                      </Show>
                    </span>
                    <Show when={props.userMeetingsStats}>
                      {(stats) => (
                        <Show when={stats().plannedMeetingsCount}>
                          <span class="text-sm text-grey-text">
                            {t("facility_user.meetings_lists.next_month")} {EM_DASH}{" "}
                            {stats().plannedMeetingsCountNextMonth}
                          </span>
                        </Show>
                      )}
                    </Show>
                  </div>
                ),
                contents: (active) => (
                  <ShowOnceShown when={active()}>
                    <div class="text-sm">
                      <Recreator signal={props.clientGroupMeetings}>
                        <TQueryTable
                          mode="embedded"
                          staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                          staticEntityURL={entityURL()}
                          staticTranslations={tableTranslations()}
                          staticPersistenceKey={getPersistenceKey("planned")}
                          staticTableId="planned"
                          columns={[
                            cols.meeting.id,
                            cols.meeting.dateTimeActions,
                            cols.meeting.get("time", {initialVisible: false}),
                            cols.meeting.get("duration", {initialVisible: false}),
                            cols.meeting.get("seriesInfo", {initialVisible: false}),
                            cols.meeting.seriesType,
                            cols.meeting.seriesNumber,
                            cols.meeting.seriesCount,
                            ...(props.staticUserType === "clients"
                              ? [
                                  cols.attendant.get("attendantClientGroup", {
                                    initialVisible: !props.clientGroupMeetings,
                                  }),
                                ]
                              : []),
                            cols.meeting.category,
                            cols.meeting.type,
                            cols.meeting.statusTags,
                            cols.attendant.get("attendanceStatus", {initialVisible: false}),
                            cols.meeting.isFacilityWide,
                            cols.meeting.attendants,
                            cols.meeting.attendantsAttendance,
                            cols.meeting.attendantsCount,
                            cols.meeting.get("staff", {initialVisible: false}),
                            cols.meeting.staffAttendance,
                            cols.meeting.staffCount,
                            cols.meeting.get("clients", {initialVisible: false}),
                            cols.meeting.clientsAttendance,
                            cols.meeting.clientsCount,
                            cols.meeting.get("isRemote", {initialVisible: false}),
                            cols.meeting.notes,
                            cols.meeting.resources,
                            cols.meeting.resourcesCount,
                            cols.meeting.resourceConflictsExist,
                            cols.meeting.resourceConflictsResources,
                            ...getCreatedUpdatedColumns(),
                          ]}
                          columnGroups={{
                            defaultInclude: false,
                            overrides: {
                              categoryDictId: true,
                              typeDictId: true,
                              meeting_multicolumn: !!props.clientGroupMeetings,
                            },
                          }}
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
                                val: presenceStatuses()!,
                              },
                            ],
                          }}
                          intrinsicSort={sortByDate({desc: false})}
                          initialSort={[{id: "date", desc: false}]}
                          initialColumnGroups={props.clientGroupMeetings ? ["meeting_multicolumn"] : undefined}
                          staticExportConfig={exportConfig("planned")}
                        />
                      </Recreator>
                    </div>
                  </ShowOnceShown>
                ),
              },
              {
                id: "completed",
                label: (
                  <div class="min-w-48 h-full flex flex-col items-center justify-center">
                    <span>
                      <Capitalize text={t("facility_user.meetings_lists.completed")} />
                      <Show when={props.userMeetingsStats}>
                        {(stats) => (
                          <span class="text-grey-text">
                            {" "}
                            {EM_DASH} {stats().completedMeetingsCount}
                          </span>
                        )}
                      </Show>
                    </span>
                    <Show when={props.userMeetingsStats}>
                      {(stats) => (
                        <Show when={stats().completedMeetingsCount}>
                          <span class="text-sm text-grey-text">
                            <Show
                              when={stats().completedMeetingsCountLastMonth}
                              fallback={
                                <>
                                  {t("facility_user.meetings_lists.last_meeting")}{" "}
                                  {stats().lastMeetingDate!.toLocaleString(DATE_FORMAT)}
                                </>
                              }
                            >
                              {t("facility_user.meetings_lists.prev_month")} {EM_DASH}{" "}
                              {stats().completedMeetingsCountLastMonth}
                            </Show>
                          </span>
                        </Show>
                      )}
                    </Show>
                  </div>
                ),
                contents: (active) => (
                  <ShowOnceShown when={active()}>
                    <div class="text-sm">
                      <Recreator signal={props.clientGroupMeetings}>
                        <TQueryTable
                          mode="embedded"
                          staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                          staticEntityURL={entityURL()}
                          staticTranslations={tableTranslations()}
                          staticPersistenceKey={getPersistenceKey("completed")}
                          staticTableId="completed"
                          columns={[
                            cols.meeting.id,
                            cols.meeting.get("dateTimeActions", {columnDef: {sortDescFirst: true}}),
                            cols.meeting.get("time", {initialVisible: false}),
                            cols.meeting.get("duration", {initialVisible: false}),
                            cols.meeting.get("seriesInfo", {initialVisible: false}),
                            cols.meeting.seriesType,
                            cols.meeting.seriesNumber,
                            cols.meeting.seriesCount,
                            ...(props.staticUserType === "clients"
                              ? [
                                  cols.attendant.get("attendantClientGroup", {
                                    initialVisible: !props.clientGroupMeetings,
                                  }),
                                ]
                              : []),
                            cols.meeting.category,
                            cols.meeting.type,
                            cols.meeting.statusTags,
                            cols.attendant.get("attendanceStatus", {initialVisible: false}),
                            cols.meeting.isFacilityWide,
                            cols.meeting.attendants,
                            cols.meeting.attendantsAttendance,
                            cols.meeting.attendantsCount,
                            cols.meeting.get("staff", {initialVisible: false}),
                            cols.meeting.staffAttendance,
                            cols.meeting.staffCount,
                            cols.meeting.get("clients", {initialVisible: false}),
                            cols.meeting.clientsAttendance,
                            cols.meeting.clientsCount,
                            cols.meeting.get("isRemote", {initialVisible: false}),
                            cols.meeting.notes,
                            cols.meeting.resources,
                            cols.meeting.resourcesCount,
                            ...getCreatedUpdatedColumns(),
                          ]}
                          columnGroups={{
                            defaultInclude: false,
                            overrides: {
                              categoryDictId: true,
                              typeDictId: true,
                              meeting_multicolumn: !!props.clientGroupMeetings,
                            },
                          }}
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
                                val: presenceStatuses()!,
                              },
                            ],
                          }}
                          intrinsicSort={sortByDate({desc: true})}
                          initialSort={[{id: "date", desc: true}]}
                          initialColumnGroups={props.clientGroupMeetings ? ["meeting_multicolumn"] : undefined}
                          staticExportConfig={exportConfig("completed")}
                        />
                      </Recreator>
                    </div>
                  </ShowOnceShown>
                ),
              },
              {
                id: "all",
                label: (
                  <div class="min-w-48 h-full flex flex-col items-center justify-center">
                    <Capitalize text={t("facility_user.meetings_lists.all")} />
                  </div>
                ),
                contents: (active) => (
                  <ShowOnceShown when={active()}>
                    <div class="text-sm">
                      <Recreator signal={props.clientGroupMeetings}>
                        <TQueryTable
                          mode="embedded"
                          staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                          staticEntityURL={entityURL()}
                          staticTranslations={tableTranslations()}
                          staticPersistenceKey={getPersistenceKey("all")}
                          staticTableId="all"
                          columns={[
                            cols.meeting.id,
                            cols.meeting.get("dateTimeActions", {columnDef: {sortDescFirst: true}}),
                            cols.meeting.get("time", {initialVisible: false}),
                            cols.meeting.get("duration", {initialVisible: false}),
                            cols.meeting.get("seriesInfo", {initialVisible: false}),
                            cols.meeting.seriesType,
                            cols.meeting.seriesNumber,
                            cols.meeting.seriesCount,
                            ...(props.staticUserType === "clients"
                              ? [
                                  cols.attendant.get("attendantClientGroup", {
                                    initialVisible: !props.clientGroupMeetings,
                                  }),
                                ]
                              : []),
                            cols.meeting.category,
                            cols.meeting.type,
                            cols.meeting.statusTags,
                            cols.attendant.get("attendanceStatus", {initialVisible: !props.clientGroupMeetings}),
                            cols.meeting.isFacilityWide,
                            cols.meeting.attendants,
                            cols.meeting.attendantsAttendance,
                            cols.meeting.attendantsCount,
                            cols.meeting.get("staff", {initialVisible: false}),
                            cols.meeting.staffAttendance,
                            cols.meeting.staffCount,
                            cols.meeting.get("clients", {initialVisible: false}),
                            cols.meeting.get("clientsAttendance", {initialVisible: props.clientGroupMeetings}),
                            cols.meeting.clientsCount,
                            cols.meeting.get("isRemote", {initialVisible: false}),
                            cols.meeting.notes,
                            cols.meeting.resources,
                            cols.meeting.resourcesCount,
                            cols.meeting.resourceConflictsExist,
                            cols.meeting.resourceConflictsResources,
                            ...getCreatedUpdatedColumns(),
                          ]}
                          columnGroups={{
                            defaultInclude: false,
                            overrides: {
                              "categoryDictId": true,
                              "typeDictId": true,
                              "statusDictId": true,
                              "attendant.attendanceStatusDictId": true,
                              "meeting_multicolumn": !!props.clientGroupMeetings,
                            },
                          }}
                          intrinsicFilter={intrinsicFilter()}
                          intrinsicSort={sortByDate({desc: true})}
                          initialSort={[{id: "date", desc: true}]}
                          initialColumnGroups={props.clientGroupMeetings ? ["meeting_multicolumn"] : undefined}
                          staticExportConfig={exportConfig("all")}
                        />
                      </Recreator>
                    </div>
                  </ShowOnceShown>
                ),
              },
            ]}
            activeTab={activeTab()}
            onActiveTabChange={setActiveTab}
          />
        </div>
      </Show>
    );
  };

  interface ClientNoGroupMeetingsTableProps {
    readonly staticUserName: string;
    readonly intrinsicFilter: FilterH;
    readonly staticPersistenceKey?: string;
  }

  const ClientNoGroupMeetingsTable: VoidComponent<ClientNoGroupMeetingsTableProps> = (props) => {
    const tableTranslations = createTableTranslations(["meeting_single_attendant", "meeting_attendant", "meeting"]);
    return (
      <Show when={dictionaries()} fallback={<BigSpinner />}>
        <div class="flex flex-col">
          <TQueryTable
            mode="embedded"
            staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
            staticEntityURL={`facility/${activeFacilityId()}/meeting/attendant`}
            staticTranslations={tableTranslations}
            staticPersistenceKey={`${props.staticPersistenceKey}.no_client_group.all`}
            staticTableId="all"
            columns={[
              cols.meeting.id,
              cols.meeting.get("dateTimeActions", {columnDef: {sortDescFirst: true}}),
              cols.meeting.get("time", {initialVisible: false}),
              cols.meeting.get("duration", {initialVisible: false}),
              cols.meeting.get("seriesInfo", {initialVisible: false}),
              cols.meeting.seriesType,
              cols.meeting.seriesNumber,
              cols.meeting.seriesCount,
              cols.meeting.category,
              cols.meeting.type,
              cols.meeting.statusTags,
              cols.attendant.attendanceStatus,
              cols.meeting.isFacilityWide,
              cols.meeting.attendants,
              cols.meeting.attendantsAttendance,
              cols.meeting.attendantsCount,
              cols.meeting.get("staff", {initialVisible: false}),
              cols.meeting.staffAttendance,
              cols.meeting.staffCount,
              cols.meeting.get("clients", {initialVisible: false}),
              cols.meeting.clientsAttendance,
              cols.meeting.clientsCount,
              cols.meeting.get("isRemote", {initialVisible: false}),
              cols.meeting.notes,
              cols.meeting.resources,
              cols.meeting.resourcesCount,
              cols.meeting.resourceConflictsExist,
              cols.meeting.resourceConflictsResources,
              ...getCreatedUpdatedColumns(),
            ]}
            columnGroups={{
              defaultInclude: false,
              overrides: {
                "categoryDictId": true,
                "typeDictId": true,
                "statusDictId": true,
                "attendant.attendanceStatusDictId": true,
              },
            }}
            intrinsicFilter={{
              type: "op",
              op: "&",
              val: [
                meetingTableFilters.isRegularMeeting() || "never",
                props.intrinsicFilter,
                {type: "column", column: "attendant.clientGroupId", op: "null"},
              ],
            }}
            intrinsicSort={sortByDate({desc: true})}
            initialSort={[{id: "date", desc: true}]}
            staticExportConfig={{
              tableName:
                `${tableTranslations.tableName()}__` +
                `${props.staticUserName.replaceAll(" ", "_")}_(${getFacilityUserTypeName(t, "clients")})`,
            }}
          />
        </div>
      </Show>
    );
  };

  function useClientWithNoGroupMeetingsCount(userId: Accessor<string | undefined>) {
    const {dataQuery} = createTQuery({
      prefixQueryKey: FacilityMeeting.keys.meeting(),
      entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/meeting/attendant`,
      requestCreator: staticRequestCreator((schema) => {
        if (!schema || !userId()) {
          return undefined;
        }
        const reductor = new FilterReductor(schema);
        return {
          columns: [{type: "column", column: "id"}],
          filter: reductor.reduce({
            type: "op",
            op: "&",
            val: [
              meetingTableFilters.isRegularMeeting() || "never",
              {type: "column", column: "attendant.userId", op: "=", val: userId()!},
              {type: "column", column: "attendant.clientGroupId", op: "null"},
            ],
          }),
          sort: [],
          paging: {size: 1},
        };
      }),
    });
    return () => (dataQuery.data ? dataQuery.data.meta.totalDataSize : undefined);
  }

  return {
    UserMeetingsTables,
    ClientNoGroupMeetingsTable,
    useClientWithNoGroupMeetingsCount,
  };
}

const ShowOnceShown: ParentComponent<{when: boolean}> = (props) => {
  const [shown, setShown] = createSignal(false);
  createComputed(() => {
    if (props.when) {
      setShown(true);
    }
  });
  return <Show when={shown()}>{props.children}</Show>;
};
