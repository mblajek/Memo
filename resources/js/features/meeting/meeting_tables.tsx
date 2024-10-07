import {Button} from "components/ui/Button";
import {RichTextView} from "components/ui/RichTextView";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, ShowCellVal, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {TextExportedCell, exportCellFunc, formatDateTimeForTextExport} from "components/ui/Table/table_export_cells";
import {DictFilterControl} from "components/ui/Table/tquery_filters/DictFilterControl";
import {NullFilterControl} from "components/ui/Table/tquery_filters/NullFilterControl";
import {UuidListSelectFilterControl} from "components/ui/Table/tquery_filters/UuidListSelectFilterControl";
import {UuidSelectFilterControl} from "components/ui/Table/tquery_filters/UuidSelectFilterControl";
import {usePositionsGrouping} from "components/ui/form/DictionarySelect";
import {actionIcons} from "components/ui/icons";
import {EM_DASH, EN_DASH, EmptyValueSymbol} from "components/ui/symbols";
import {title} from "components/ui/title";
import {htmlAttributes, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE, dayMinuteToHM, formatDayMinuteHM} from "components/utils/day_minute_util";
import {DATE_FORMAT} from "components/utils/formatting";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {AlignedTime} from "components/utils/time_formatting";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingAttendantResource, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {ScrollableCell, createTableColumnsSet} from "data-access/memo-api/tquery/table_columns";
import {DateTime} from "luxon";
import {Index, Match, ParentComponent, Show, Switch, VoidComponent, splitProps} from "solid-js";
import {SharedClientGroupLabel} from "../client/SharedClientGroupLabel";
import {UserLink} from "../facility-users/UserLink";
import {FacilityUserType} from "../facility-users/user_types";
import {MeetingDeleteButton} from "./MeetingDeleteButton";
import {MeetingInSeriesInfo, MeetingIntervalCommentText, SeriesNumberInfo} from "./MeetingInSeriesInfo";
import {MeetingStatusTags} from "./MeetingStatusTags";
import {MeetingAttendanceStatus} from "./attendance_status_info";
import {createMeetingModal} from "./meeting_modal";
import {createWorkTimeModal} from "./work_time_modal";

type _Directives = typeof title;

type TQFullMeetingResource = TQMeetingResource & {
  readonly attendants: readonly TQMeetingAttendantResource[];
};

type TQMeetingAttendanceResource = TQFullMeetingResource & {
  readonly "attendant.attendanceTypeDictId": string;
  readonly "attendant.id": string;
  readonly "attendant.name": string;
  readonly "attendant.clientGroupId": string;
  readonly "attendant.attendanceStatusDictId": string;
};

export function useMeetingTableColumns({baseHeight}: {baseHeight?: string} = {}) {
  const t = useLangFunc();
  const {meetingTypeDict, meetingCategoryDict, attendanceTypeDict} = useFixedDictionaries();
  const meetingModal = createMeetingModal();
  const workTimeModal = createWorkTimeModal();
  const modelQuerySpecs = useModelQuerySpecs();
  const {getMeetingTypeCategory} = usePositionsGrouping();

  const MeetingTime: VoidComponent<{
    readonly startDayMinute: number | undefined;
    readonly durationMinutes: number | undefined;
  }> = (props) => (
    <Switch>
      <Match when={props.startDayMinute === 0 && props.durationMinutes === MAX_DAY_MINUTE}>
        {t("calendar.all_day")}
      </Match>
      <Match when={props.startDayMinute !== undefined && props.durationMinutes !== undefined}>
        <AlignedTime dayMinute={props.startDayMinute!} /> {EN_DASH}{" "}
        <AlignedTime dayMinute={(props.startDayMinute! + props.durationMinutes!) % MAX_DAY_MINUTE} />
      </Match>
    </Switch>
  );

  function isWorkTimeLeaveTime(typeDictId: string | undefined) {
    return typeDictId === meetingTypeDict()?.work_time.id || typeDictId === meetingTypeDict()?.leave_time.id;
  }

  const DetailsButton: ParentComponent<
    {readonly meetingId: string | undefined; readonly meetingType?: string | undefined} & htmlAttributes.button
  > = (allProps) => {
    const [props, buttonProps] = splitProps(allProps, ["meetingId", "meetingType", "children"]);
    return (
      <Show when={props.meetingId}>
        {(meetingId) => (
          <Button
            {...buttonProps}
            onClick={() => {
              if (isWorkTimeLeaveTime(props.meetingType)) {
                workTimeModal.show({staticMeetingId: meetingId(), initialViewMode: true, showGoToMeetingButton: true});
              } else {
                meetingModal.show({staticMeetingId: meetingId(), initialViewMode: true, showGoToMeetingButton: true});
              }
            }}
          >
            <actionIcons.Details class="inlineIcon !mb-[2px]" /> {props.children || t("actions.details")}
          </Button>
        )}
      </Show>
    );
  };

  const meetingColumns = {
    id: {name: "id", initialVisible: false, columnGroups: ":meeting_multicolumn"},
    date: {
      name: "date",
      columnDef: {size: 190, sortDescFirst: true, enableHiding: false},
      columnGroups: ["meeting_multicolumn", true],
    },
    time: {
      name: "startDayminute",
      extraDataColumns: ["durationMinutes"],
      columnDef: {
        cell: cellFunc<number, TQFullMeetingResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>
              {(v) => <MeetingTime startDayMinute={v()} durationMinutes={props.row.durationMinutes} />}
            </ShowCellVal>
          </PaddedCell>
        )),
        sortDescFirst: false,
        enableColumnFilter: false,
        size: 120,
      },
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, number, TQFullMeetingResource>(
          (v, ctx) => `${formatDayMinuteHM(v)}-${formatDayMinuteHM((v + ctx.row.durationMinutes) % MAX_DAY_MINUTE)}`,
        ),
      },
      columnGroups: "meeting_multicolumn",
    },
    duration: {
      name: "durationMinutes",
      initialVisible: false,
      columnDef: {size: 120},
      columnGroups: "meeting_multicolumn",
    },
    seriesInfo: {
      name: "isClone",
      extraDataColumns: ["interval", "seriesNumber", "seriesCount"],
      columnDef: {
        cell: cellFunc<boolean, TQFullMeetingResource>((props) => (
          <PaddedCell class="text-right">
            <ShowCellVal v={props.v}>
              {(v) => (
                <Show when={v()} fallback={<EmptyValueSymbol />}>
                  <div class="flex flex-col items-end">
                    <SeriesNumberInfo
                      seriesNumber={props.ctx.row.original.seriesNumber}
                      seriesCount={props.ctx.row.original.seriesCount}
                    />
                    <div class="text-grey-text -mt-1">
                      <MeetingIntervalCommentText interval={props.row.interval || undefined} />
                    </div>
                  </div>
                </Show>
              )}
            </ShowCellVal>
          </PaddedCell>
        )),
        size: 150,
        enableSorting: false,
      },
      columnGroups: "meeting_multicolumn",
    },
    seriesType: {
      name: "interval",
      initialVisible: false,
      columnDef: {
        cell: cellFunc<string, TQFullMeetingResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>
              {(v) => (
                <div>
                  {v()}
                  <span class="text-grey-text">
                    {" "}
                    <MeetingIntervalCommentText interval={v()} />
                  </span>
                </div>
              )}
            </ShowCellVal>
          </PaddedCell>
        )),
        size: 120,
        sortDescFirst: false,
      },
      columnGroups: "meeting_multicolumn",
    },
    seriesNumber: {
      name: "seriesNumber",
      columnDef: {sortDescFirst: false},
      initialVisible: false,
      columnGroups: "meeting_multicolumn",
    },
    seriesCount: {
      name: "seriesCount",
      columnDef: {sortDescFirst: false},
      initialVisible: false,
      columnGroups: "meeting_multicolumn",
    },
    category: {
      name: "categoryDictId",
      initialVisible: false,
      columnGroups: ["meeting_multicolumn", true, "typeDictId"],
    },
    type: {
      name: "typeDictId",
      filterControl: (props) => (
        <DictFilterControl
          {...props}
          positionItemsFunc={(dict, defItem) =>
            dict.activePositions
              .filter((p) => getMeetingTypeCategory(p) !== meetingCategoryDict()?.system.id)
              .map(defItem)
          }
        />
      ),
      columnGroups: ["meeting_multicolumn", true],
    },
    workTimeType: {
      name: "typeDictId",
      filterControl: (props) => (
        <DictFilterControl
          {...props}
          positionItemsFunc={(dict, defItem) =>
            dict.activePositions
              .filter((p) => p.id === meetingTypeDict()?.work_time.id || p.id === meetingTypeDict()?.leave_time.id)
              .map((pos) => ({...defItem(pos), groupName: undefined}))
          }
        />
      ),
      columnGroups: ["meeting_multicolumn", true],
    },
    statusTags: {
      name: "statusDictId",
      extraDataColumns: {standard: ["staff", "clients", "isRemote"], whenGrouping: []},
      columnDef: {
        cell: cellFunc<string, TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <ShowCellVal v={props.v}>
              <MeetingStatusTags meeting={props.row} showPlannedTag />
            </ShowCellVal>
          </ScrollableCell>
        )),
      },
      columnGroups: ["meeting_multicolumn", true],
      // TODO: Consider a custom textExportCell that includes all the status tags, not just the meeting status.
    },
    isFacilityWide: {name: "isFacilityWide", initialVisible: false, columnGroups: "meeting_multicolumn"},
    attendants: {
      name: "attendants.*.userId",
      extraDataColumns: ["attendants"],
      columnDef: {
        cell: cellFunc<readonly string[], TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <ShowCellVal v={props.row.attendants}>
              {(v) => (
                <div class="flex flex-col gap-1">
                  <UserLinks
                    type="staff"
                    users={v().filter((u) => u.attendanceTypeDictId === attendanceTypeDict()?.staff.id)}
                  />
                  <UserLinks
                    type="clients"
                    users={v().filter((u) => u.attendanceTypeDictId === attendanceTypeDict()?.client.id)}
                  />
                </div>
              )}
            </ShowCellVal>
          </ScrollableCell>
        )),
        size: 250,
      },
      filterControl: (props) => <UuidListSelectFilterControl {...props} {...modelQuerySpecs.userStaffOrClient()} />,
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, TQMeetingAttendantResource[], TQFullMeetingResource>(
          (v, ctx) => ctx.row.attendants?.map((u) => u.name).join(", "),
        ),
      },
      columnGroups: "meeting_multicolumn",
    },
    attendantsAttendance: {
      name: "attendants.*.attendanceStatusDictId",
      initialVisible: false,
      columnGroups: "meeting_multicolumn",
    },
    attendantsCount: {name: "attendants.count", initialVisible: false, columnGroups: "meeting_multicolumn"},
    staff: {
      name: "staff.*.userId",
      extraDataColumns: ["staff"],
      columnDef: {
        cell: cellFunc<readonly string[], TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <UserLinks type="staff" users={props.row.staff} />
          </ScrollableCell>
        )),
        size: 250,
      },
      filterControl: (props) => <UuidListSelectFilterControl {...props} {...modelQuerySpecs.userStaff()} />,
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, TQMeetingAttendantResource[], TQFullMeetingResource>(
          (v, ctx) => ctx.row.staff.map((u) => u.name).join(", "),
        ),
      },
      columnGroups: "meeting_multicolumn",
    },
    staffAttendance: {
      name: "staff.*.attendanceStatusDictId",
      initialVisible: false,
      columnGroups: "meeting_multicolumn",
    },
    staffCount: {name: "staff.count", initialVisible: false, columnGroups: "meeting_multicolumn"},
    clients: {
      name: "clients.*.userId",
      extraDataColumns: ["clients"],
      columnDef: {
        cell: cellFunc<readonly string[], TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <UserLinks type="clients" users={props.row.clients} />
          </ScrollableCell>
        )),
        size: 250,
      },
      filterControl: (props) => <UuidListSelectFilterControl {...props} {...modelQuerySpecs.userClient()} />,
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, TQMeetingAttendantResource[], TQFullMeetingResource>(
          (v, ctx) => ctx.row.clients.map((u) => u.name).join(", "),
        ),
      },
      columnGroups: "meeting_multicolumn",
    },
    clientsAttendance: {
      name: "clients.*.attendanceStatusDictId",
      initialVisible: false,
      columnGroups: "meeting_multicolumn",
    },
    clientsCount: {name: "clients.count", initialVisible: false, columnGroups: "meeting_multicolumn"},
    isRemote: {name: "isRemote", columnGroups: "meeting_multicolumn"},
    notes: {
      name: "notes",
      columnDef: {
        cell: cellFunc<string, TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <ShowCellVal v={props.v}>{(v) => <RichTextView text={v()} />}</ShowCellVal>
          </ScrollableCell>
        )),
      },
      columnGroups: "meeting_multicolumn",
    },
    workTimeNotes: {name: "notes", columnGroups: "meeting_multicolumn"},
    resources: {name: "resources.*.dictId", columnGroups: "meeting_multicolumn"},
    resourceConflictsExist: {
      name: "resourceConflicts.exists",
      columnGroups: "meeting_multicolumn",
      initialVisible: false,
      persistVisibility: false,
    },
    resourceConflictsResources: {
      name: "resourceConflicts.*.resourceDictId",
      columnGroups: "meeting_multicolumn",
      initialVisible: false,
      persistVisibility: false,
    },
    actions: {
      name: "actions",
      isDataColumn: false,
      // seriesCount, seriesNumber, interval are needed for delete confirmation. Alternatively, they could be fetched
      // when delete is clicked, but this would complicate the confirmation with query barriers
      extraDataColumns: ["id", "categoryDictId", "typeDictId", "seriesCount", "seriesNumber", "interval"],
      columnDef: {
        cell: (c) => (
          <PaddedCell class="flex gap-1 h-min">
            <DetailsButton class="minimal" meetingId={c.row.original.id} meetingType={c.row.original.typeDictId} />
            <MeetingDeleteButton class="minimal" meeting={c.row.original} />
          </PaddedCell>
        ),
        enableSorting: false,
        enableHiding: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
      columnGroups: "meeting_multicolumn",
    },
    dateTimeActions: {
      name: "date",
      extraDataColumns: [
        "startDayminute",
        "durationMinutes",
        "fromMeetingId",
        "interval",
        "seriesNumber",
        "seriesCount",
        "id",
      ],
      columnDef: {
        cell: cellFunc<string, TQFullMeetingResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>
              {(v) => (
                <div class="flex gap-2 justify-between items-start">
                  <div class="flex flex-col overflow-clip">
                    <div>{DateTime.fromISO(v()).toLocaleString({...DATE_FORMAT, weekday: "long"})}</div>
                    <Show when={props.row.startDayminute !== undefined}>
                      <div>
                        <MeetingTime
                          startDayMinute={props.row.startDayminute}
                          durationMinutes={props.row.durationMinutes}
                        />{" "}
                        <MeetingInSeriesInfo meeting={props.row} compact />
                      </div>
                    </Show>
                  </div>
                  <DetailsButton
                    meetingId={props.row.id}
                    class="shrink-0 secondary small"
                    title={t("meetings.click_to_see_details")}
                  >
                    {t("meetings.show_details")}
                  </DetailsButton>
                </div>
              )}
            </ShowCellVal>
          </PaddedCell>
        )),
      },
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, string, TQFullMeetingResource>((v, ctx) =>
          formatDateTimeForTextExport(DateTime.fromISO(v).set(dayMinuteToHM(ctx.row.startDayminute))),
        ),
      },
      columnGroups: "meeting_multicolumn",
    },
  } satisfies Partial<Record<string, PartialColumnConfig<TQFullMeetingResource>>>;
  const attendantColumn = {
    name: "attendant.userId",
    extraDataColumns: ["attendant.name"],
    columnDef: {
      cell: cellFunc<string, TQMeetingAttendanceResource>((props) => (
        <PaddedCell>
          <ShowCellVal v={props.v}>
            {(v) => <UserLink userId={v()} name={props.row["attendant.name"] as string | undefined} />}
          </ShowCellVal>
        </PaddedCell>
      )),
      size: 250,
      enableHiding: false,
    },
    filterControl: (props) => <UuidSelectFilterControl {...props} {...modelQuerySpecs.userStaffOrClient()} />,
    metaParams: {
      textExportCell: exportCellFunc<TextExportedCell, string, TQMeetingAttendanceResource>(
        (v, ctx) => ctx.row["attendant.name"],
      ),
    },
    columnGroups: "::attendant_multicolumn",
  } satisfies PartialColumnConfig<TQMeetingAttendanceResource>;
  const attendantsColumns = {
    attendanceType: {name: "attendant.attendanceTypeDictId", columnGroups: "attendant_multicolumn"},
    attendant: attendantColumn,
    attendantStaff: {
      ...attendantColumn,
      filterControl: (props) => <UuidSelectFilterControl {...props} {...modelQuerySpecs.userStaff()} />,
    },
    attendantClient: {
      ...attendantColumn,
      filterControl: (props) => <UuidSelectFilterControl {...props} {...modelQuerySpecs.userClient()} />,
    },
    attendantClientGroup: {
      name: "attendant.clientGroupId",
      columnDef: {
        cell: cellFunc<string, TQMeetingAttendanceResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>{(v) => <SharedClientGroupLabel groupId={v()} />}</ShowCellVal>
          </PaddedCell>
        )),
        size: 250,
      },
      filterControl: NullFilterControl,
      initialVisible: false,
      columnGroups: true,
    },
    attendanceStatus: {
      name: "attendant.attendanceStatusDictId",
      extraDataColumns: {standard: ["statusDictId"], whenGrouping: []},
      columnDef: {
        cell: cellFunc<string, TQMeetingAttendanceResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>
              {(v) => (
                <MeetingAttendanceStatus
                  attendanceStatusId={v()}
                  meetingStatusId={props.row.statusDictId as string | undefined}
                />
              )}
            </ShowCellVal>
          </PaddedCell>
        )),
        size: 200,
      },
      columnGroups: true,
    },
  } satisfies Partial<Record<string, PartialColumnConfig<TQMeetingAttendanceResource>>>;
  return {
    meeting: createTableColumnsSet(meetingColumns),
    attendant: createTableColumnsSet(attendantsColumns),
  };
}

interface UserLinksProps {
  readonly type: FacilityUserType;
  readonly users: readonly TQMeetingAttendantResource[] | null | undefined;
}

const UserLinks: VoidComponent<UserLinksProps> = (props) => {
  const {attendanceStatusDict} = useFixedDictionaries();
  return (
    <Show when={props.users} fallback={<EmptyValueSymbol />}>
      <ul>
        <Index each={props.users}>
          {(user) => (
            <li>
              <UserLink type={props.type} icon userId={user().userId} name={user().name} />
              <Show when={user().attendanceStatusDictId !== attendanceStatusDict()?.ok.id}>
                {" "}
                <span class="text-grey-text">
                  {EM_DASH} <MeetingAttendanceStatus attendanceStatusId={user().attendanceStatusDictId} />
                </span>
              </Show>
            </li>
          )}
        </Index>
      </ul>
    </Show>
  );
};

export function useMeetingTableFilters() {
  const {meetingCategoryDict} = useFixedDictionaries();
  const isSystemMeeting = () =>
    meetingCategoryDict() &&
    ({
      type: "column",
      column: "categoryDictId",
      op: "=",
      val: meetingCategoryDict()!.system.id,
    } satisfies FilterH);
  return {
    isSystemMeeting,
    isRegularMeeting: () => {
      const system = isSystemMeeting();
      return system && ({...system, inv: true} satisfies FilterH);
    },
  };
}
