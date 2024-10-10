import {createHistoryPersistence} from "components/persistence/history_persistence";
import {Capitalize} from "components/ui/Capitalize";
import {BigSpinner} from "components/ui/Spinner";
import {TableExportConfig, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {Tabs} from "components/ui/Tabs";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {EM_DASH} from "components/ui/symbols";
import {DATE_FORMAT, useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {Sort} from "data-access/memo-api/tquery/types";
import {Accessor, ParentComponent, Show, VoidComponent, createComputed, createSignal} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {useAttendanceStatusesInfo} from "../meeting/attendance_status_info";
import {useMeetingTableColumns, useMeetingTableFilters} from "../meeting/meeting_tables";
import {UserMeetingsStats} from "./user_meetings_stats";
import {FacilityUserType, getFacilityUserTypeName} from "./user_types";

interface Props {
  readonly userName: string;
  readonly userType: FacilityUserType;
  readonly intrinsicFilter: FilterH;
  readonly staticPersistenceKey?: string;
  readonly userMeetingsStats?: Accessor<UserMeetingsStats | undefined>;
}

export const UserMeetingsTables: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {dictionaries, meetingStatusDict} = useFixedDictionaries();
  const {presenceStatuses} = useAttendanceStatusesInfo();
  const entityURL = () => `facility/${activeFacilityId()}/meeting/attendant`;
  const cols = useMeetingTableColumns({baseHeight: "3.5rem"});
  const meetingTableFilters = useMeetingTableFilters();
  const {getCreatedUpdatedColumns} = useTableColumns();
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
  const tableTranslations = createTableTranslations(["meeting_single_attendant", "meeting_attendant", "meeting"]);
  function exportConfig(tableType: "planned" | "completed" | "all"): TableExportConfig {
    const baseName =
      tableType === "all" ? tableTranslations.tableName() : t(`facility_user.meetings_lists.${tableType}`);
    const userName = `${props.userName.replaceAll(" ", "_")}_(${getFacilityUserTypeName(t, props.userType)})`;
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
  return (
    <div class="flex flex-col">
      <Show when={dictionaries()} fallback={<BigSpinner />}>
        <StandaloneFieldLabel>
          <Capitalize text={tableTranslations.tableName()} />
        </StandaloneFieldLabel>
        <Tabs
          tabs={[
            {
              id: "planned",
              label: (
                <div class="min-w-48 h-full flex flex-col items-center justify-center">
                  <span>
                    <Capitalize text={t("facility_user.meetings_lists.planned")} />
                    <Show when={props.userMeetingsStats?.()}>
                      {(stats) => (
                        <span class="text-grey-text">
                          {" "}
                          {EM_DASH} {stats().plannedMeetingsCount}
                        </span>
                      )}
                    </Show>
                  </span>
                  <Show when={props.userMeetingsStats?.()}>
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
                    <TQueryTable
                      mode="embedded"
                      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                      staticEntityURL={entityURL()}
                      staticTranslations={tableTranslations}
                      staticPersistenceKey={`${props.staticPersistenceKey}.planned`}
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
                        ...(props.userType === "clients" ? [cols.attendant.attendantClientGroup] : []),
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
                        cols.meeting.resourceConflictsExist,
                        cols.meeting.resourceConflictsResources,
                        ...getCreatedUpdatedColumns(),
                      ]}
                      columnGroups={{
                        defaultInclude: false,
                        overrides: {
                          categoryDictId: true,
                          typeDictId: true,
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
                      staticExportConfig={exportConfig("planned")}
                    />
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
                    <Show when={props.userMeetingsStats?.()}>
                      {(stats) => (
                        <span class="text-grey-text">
                          {" "}
                          {EM_DASH} {stats().completedMeetingsCount}
                        </span>
                      )}
                    </Show>
                  </span>
                  <Show when={props.userMeetingsStats?.()}>
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
                    <TQueryTable
                      mode="embedded"
                      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                      staticEntityURL={entityURL()}
                      staticTranslations={tableTranslations}
                      staticPersistenceKey={`${props.staticPersistenceKey}.completed`}
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
                        ...(props.userType === "clients" ? [cols.attendant.attendantClientGroup] : []),
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
                        ...getCreatedUpdatedColumns(),
                      ]}
                      columnGroups={{
                        defaultInclude: false,
                        overrides: {
                          categoryDictId: true,
                          typeDictId: true,
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
                      staticExportConfig={exportConfig("completed")}
                    />
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
                    <TQueryTable
                      mode="embedded"
                      staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                      staticEntityURL={entityURL()}
                      staticTranslations={tableTranslations}
                      staticPersistenceKey={`${props.staticPersistenceKey}.all`}
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
                        ...(props.userType === "clients" ? [cols.attendant.attendantClientGroup] : []),
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
                      intrinsicFilter={intrinsicFilter()}
                      intrinsicSort={sortByDate({desc: true})}
                      initialSort={[{id: "date", desc: true}]}
                      staticExportConfig={exportConfig("all")}
                    />
                  </div>
                </ShowOnceShown>
              ),
            },
          ]}
          activeTab={activeTab()}
          onActiveTabChange={setActiveTab}
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
