import {Capitalize} from "components/ui/Capitalize";
import {BigSpinner} from "components/ui/Spinner";
import {createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {Tabs} from "components/ui/Tabs";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {Sort} from "data-access/memo-api/tquery/types";
import {Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {useMeetingTableColumns} from "../meeting/meeting_tables";

interface Props {
  readonly intrinsicFilter: FilterH;
  readonly staticPersistenceKey?: string;
}

export const UserMeetingsTables: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {dictionaries, meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  const entityURL = () => `facility/${activeFacilityId()}/meeting/attendant`;
  const meetingTableColumns = useMeetingTableColumns();
  function sortByDate({desc}: {desc: boolean}) {
    return [
      {type: "column", column: "date", desc},
      {type: "column", column: "startDayminute", desc},
    ] satisfies Sort;
  }
  const tableTranslations = createTableTranslations("meeting");
  return (
    <div>
      <Show when={dictionaries()} fallback={<BigSpinner />}>
        <Capitalize class="font-medium" text={tableTranslations.tableName()} />
        <Tabs
          tabs={[
            {
              id: "planned",
              label: <Capitalize text={t("facility_user.meetings_lists.planned")} />,
              contents: (
                <div class="text-sm">
                  <TQueryTable
                    mode="embedded"
                    staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                    staticEntityURL={entityURL()}
                    staticTranslations={tableTranslations}
                    staticPersistenceKey={`${props.staticPersistenceKey}.planned`}
                    intrinsicFilter={{
                      type: "op",
                      op: "&",
                      val: [
                        props.intrinsicFilter,
                        {
                          type: "column",
                          column: "statusDictId",
                          op: "=",
                          val: meetingStatusDict()!.planned.id,
                        },
                      ],
                    }}
                    intrinsicSort={sortByDate({desc: false})}
                    columns={meetingTableColumns.get(
                      "id",
                      "date",
                      "time",
                      "duration",
                      "category",
                      "type",
                      {...meetingTableColumns.columns.status, initialVisible: false},
                      "attendanceStatus",
                      "staff",
                      "staffAttendance",
                      "clients",
                      "clientsAttendance",
                      "isRemote",
                      "statusTags",
                      "notes",
                      "resources",
                      "createdAt",
                      "createdBy",
                      "updatedAt",
                      "actions",
                    )}
                    initialSort={[{id: "date", desc: false}]}
                  />
                </div>
              ),
            },
            {
              id: "completed",
              label: <Capitalize text={t("facility_user.meetings_lists.completed")} />,
              contents: (
                <div class="text-sm">
                  <TQueryTable
                    mode="embedded"
                    staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                    staticEntityURL={entityURL()}
                    staticTranslations={tableTranslations}
                    staticPersistenceKey={`${props.staticPersistenceKey}.completed`}
                    intrinsicFilter={{
                      type: "op",
                      op: "&",
                      val: [
                        props.intrinsicFilter,
                        {
                          type: "op",
                          op: "|",
                          val: [
                            {
                              type: "column",
                              column: "statusDictId",
                              op: "=",
                              val: meetingStatusDict()!.planned.id,
                              inv: true,
                            },
                            {
                              type: "column",
                              column: "attendant.attendanceStatusDictId",
                              op: "=",
                              val: attendanceStatusDict()!.ok.id,
                              inv: true,
                            },
                          ],
                        },
                      ],
                    }}
                    intrinsicSort={sortByDate({desc: true})}
                    columns={meetingTableColumns.get(
                      "id",
                      "date",
                      "time",
                      "duration",
                      "category",
                      "type",
                      "status",
                      "attendanceStatus",
                      "staff",
                      "staffAttendance",
                      "clients",
                      "clientsAttendance",
                      "isRemote",
                      "statusTags",
                      "notes",
                      "resources",
                      "createdAt",
                      "createdBy",
                      "updatedAt",
                      "actions",
                    )}
                    initialSort={[{id: "date", desc: true}]}
                  />
                </div>
              ),
            },
            {
              id: "all",
              label: <Capitalize text={t("facility_user.meetings_lists.all")} />,
              contents: (
                <div class="text-sm">
                  <TQueryTable
                    mode="embedded"
                    staticPrefixQueryKey={FacilityMeeting.keys.meeting()}
                    staticEntityURL={entityURL()}
                    staticTranslations={tableTranslations}
                    staticPersistenceKey={`${props.staticPersistenceKey}.all`}
                    intrinsicFilter={props.intrinsicFilter}
                    intrinsicSort={sortByDate({desc: true})}
                    columns={meetingTableColumns.get(
                      "id",
                      "date",
                      "time",
                      "duration",
                      "category",
                      "type",
                      "status",
                      "attendanceStatus",
                      "staff",
                      "staffAttendance",
                      "clients",
                      "clientsAttendance",
                      "isRemote",
                      "statusTags",
                      "notes",
                      "resources",
                      "createdAt",
                      "createdBy",
                      "updatedAt",
                      "actions",
                    )}
                    initialSort={[{id: "date", desc: true}]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Show>
    </div>
  );
};
