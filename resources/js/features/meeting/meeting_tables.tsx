import {Button, DeleteButton} from "components/ui/Button";
import {RichTextView} from "components/ui/RichTextView";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, ShowCellVal, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {TextExportedCell, exportCellFunc, formatDateTimeForTextExport} from "components/ui/Table/table_export_cells";
import {DictFilterControl} from "components/ui/Table/tquery_filters/DictFilterControl";
import {UuidListSelectFilterControl} from "components/ui/Table/tquery_filters/UuidListSelectFilterControl";
import {UuidSelectFilterControl} from "components/ui/Table/tquery_filters/UuidSelectFilterControl";
import {createConfirmation} from "components/ui/confirmation";
import {usePositionsGrouping} from "components/ui/form/DictionarySelect";
import {actionIcons} from "components/ui/icons";
import {EM_DASH, EN_DASH, EmptyValueSymbol} from "components/ui/symbols";
import {title} from "components/ui/title";
import {htmlAttributes, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE, dayMinuteToHM, formatDayMinuteHM} from "components/utils/day_minute_util";
import {DATE_FORMAT} from "components/utils/formatting";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {toastSuccess} from "components/utils/toast";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {TQMeetingAttendantResource, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {FilterH, invertFilter} from "data-access/memo-api/tquery/filter_utils";
import {ScrollableCell, createTableColumnsSet} from "data-access/memo-api/tquery/table_columns";
import {DateTime} from "luxon";
import {Index, Match, ParentComponent, Show, Switch, VoidComponent, splitProps} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {FacilityUserType} from "../facility-users/user_types";
import {MeetingInSeriesInfo, MeetingIntervalCommentText, SeriesNumberInfo} from "./MeetingInSeriesInfo";
import {MeetingStatusTags} from "./MeetingStatusTags";
import {workTimeDeleteConfirmParams} from "./WorkTimeViewEditForm";
import {MeetingAttendanceStatus} from "./attendance_status_info";
import {useMeetingAPI} from "./meeting_api";
import {createMeetingModal} from "./meeting_modal";
import {createWorkTimeModal} from "./work_time_modal";
import {confirmDelete, MeetingForDelete} from "./DeleteMeeting";
import {SeriesDeleteOption} from "data-access/memo-api/resources/meeting.resource";

const _DIRECTIVES_ = null && title;

type TQFullMeetingResource = TQMeetingResource & {
  readonly attendants: readonly TQMeetingAttendantResource[];
};

type TQMeetingAttendanceResource = TQFullMeetingResource & {
  readonly "attendant.attendanceTypeDictId": string;
  readonly "attendant.id": string;
  readonly "attendant.name": string;
  readonly "attendant.attendanceStatusDictId": string;
};

export function useMeetingTableColumns({baseHeight}: {baseHeight?: string} = {}) {
  const t = useLangFunc();
  const {meetingTypeDict, meetingCategoryDict, attendanceTypeDict} = useFixedDictionaries();
  const meetingModal = createMeetingModal();
  const workTimeModal = createWorkTimeModal();
  const confirmation = createConfirmation();
  const modelQuerySpecs = useModelQuerySpecs();
  const {getMeetingTypeCategory} = usePositionsGrouping();
  const meetingAPI = useMeetingAPI();
  const invalidate = useInvalidator();

  const MeetingTime: VoidComponent<{
    readonly startDayMinute: number | undefined;
    readonly durationMinutes: number | undefined;
  }> = (props) => (
    <Switch>
      <Match when={props.startDayMinute === 0 && props.durationMinutes === MAX_DAY_MINUTE}>
        {t("calendar.all_day")}
      </Match>
      <Match when={props.startDayMinute !== undefined && props.durationMinutes !== undefined}>
        {formatDayMinuteHM(props.startDayMinute!, {hour: "2-digit"})} {EN_DASH}{" "}
        {formatDayMinuteHM((props.startDayMinute! + props.durationMinutes!) % MAX_DAY_MINUTE, {hour: "2-digit"})}
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

  const MeetingDeleteButton: ParentComponent<
    {
      readonly meetingId: string | undefined;
      readonly meetingType?: string | undefined;
      readonly meeting: MeetingForDelete;
    } & htmlAttributes.button
  > = (allProps) => {
    const [props, buttonProps] = splitProps(allProps, ["meetingId", "meetingType", "children", "meeting"]);
    async function deleteMeeting(meetingId: string, deleteOption: SeriesDeleteOption | undefined) {
      // TODO: This function is very similar to deleteMeeting in MeetingViewEditForm.tsx - perhaps it could be shared?

      if (!deleteOption) {
        // deleteOption is undefined if confirmation was skipped with ctrl/alt - in this case we default to ONE
        deleteOption = SeriesDeleteOption.ONE;
      }
      const {count} = await meetingAPI.delete(meetingId, deleteOption);
      toastSuccess(t("forms.meeting_delete.success", {count}));
      invalidate.facility.meetings();
    }
    async function confirmDeleteLocal(): Promise<SeriesDeleteOption | undefined> {
      if (isWorkTimeLeaveTime(props.meetingType)) {
        if (!(await confirmation.confirm(workTimeDeleteConfirmParams(t)))) {
          return undefined;
        }
        // TODO: Handle SeriesDeleteOption for work times
        return SeriesDeleteOption.ONE;
      } else {
        return confirmDelete(confirmation, t, props.meeting);
      }
    }
    return (
      <Show when={props.meetingId}>
        {(meetingId) => (
          <DeleteButton
            {...buttonProps}
            confirm={confirmDeleteLocal}
            delete={(deleteOption: SeriesDeleteOption | undefined) => deleteMeeting(meetingId(), deleteOption)}
          />
        )}
      </Show>
    );
  };

  const meetingColumns = {
    id: {name: "id", initialVisible: false, columnGroups: ":meeting"},
    date: {
      name: "date",
      columnDef: {size: 190, sortDescFirst: true, enableHiding: false},
      columnGroups: ["meeting", true],
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
      columnGroups: "meeting",
    },
    duration: {name: "durationMinutes", initialVisible: false, columnDef: {size: 120}, columnGroups: "meeting"},
    seriesInfo: {
      name: "isClone",
      extraDataColumns: ["interval", "seriesNumber", "seriesCount"],
      columnDef: {
        cell: cellFunc<boolean, TQFullMeetingResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>
              {(v) => (
                <Show when={v()} fallback={<EmptyValueSymbol />}>
                  <div class="flex flex-col items-end">
                    <SeriesNumberInfo
                      seriesNumber={props.ctx.row.original.seriesNumber}
                      seriesCount={props.ctx.row.original.seriesCount}
                    />
                    <div class="text-grey-text">
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
      columnGroups: "meeting",
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
      columnGroups: "meeting",
    },
    seriesNumber: {
      name: "seriesNumber",
      columnDef: {sortDescFirst: false},
      initialVisible: false,
      columnGroups: "meeting",
    },
    seriesCount: {
      name: "seriesCount",
      columnDef: {sortDescFirst: false},
      initialVisible: false,
      columnGroups: "meeting",
    },
    category: {name: "categoryDictId", initialVisible: false, columnGroups: ["meeting", true, "typeDictId"]},
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
      columnGroups: ["meeting", true],
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
      columnGroups: ["meeting", true],
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
      columnGroups: ["meeting", true],
      // TODO: Consider a custom textExportCell that includes all the status tags, not just the meeting status.
    },
    attendants: {
      name: "attendants.*.userId",
      extraDataColumns: ["attendants"],
      columnDef: {
        cell: cellFunc<readonly string[], TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight} class="flex flex-col gap-1">
            <ShowCellVal v={props.row.attendants}>
              {(v) => (
                <>
                  <UserLinks
                    type="staff"
                    users={v().filter((u) => u.attendanceTypeDictId === attendanceTypeDict()?.staff.id)}
                  />
                  <UserLinks
                    type="clients"
                    users={v().filter((u) => u.attendanceTypeDictId === attendanceTypeDict()?.client.id)}
                  />
                </>
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
      columnGroups: "meeting",
    },
    attendantsAttendance: {name: "attendants.*.attendanceStatusDictId", initialVisible: false, columnGroups: "meeting"},
    attendantsCount: {name: "attendants.count", initialVisible: false, columnGroups: "meeting"},
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
      columnGroups: "meeting",
    },
    staffAttendance: {name: "staff.*.attendanceStatusDictId", initialVisible: false, columnGroups: "meeting"},
    staffCount: {name: "staff.count", initialVisible: false, columnGroups: "meeting"},
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
      columnGroups: "meeting",
    },
    clientsAttendance: {name: "clients.*.attendanceStatusDictId", initialVisible: false, columnGroups: "meeting"},
    clientsCount: {name: "clients.count", initialVisible: false, columnGroups: "meeting"},
    isRemote: {name: "isRemote", columnGroups: "meeting"},
    notes: {
      name: "notes",
      columnDef: {
        cell: cellFunc<string, TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <ShowCellVal v={props.v}>{(v) => <RichTextView text={v()} />}</ShowCellVal>
          </ScrollableCell>
        )),
      },
      columnGroups: "meeting",
    },
    workTimeNotes: {name: "notes", columnGroups: "meeting"},
    resources: {name: "resources.*.dictId", columnGroups: "meeting"},
    actions: {
      name: "actions",
      isDataColumn: false,
      // seriesCount, seriesNumber, interval are needed for delete confirmation. Alternatively, they could be fetched
      // when delete is clicked, but this would complicate the confirmation with query barriers
      extraDataColumns: ["id", "typeDictId", "seriesCount", "seriesNumber", "interval"],
      columnDef: {
        cell: (c) => (
          <PaddedCell class="flex gap-1 h-min">
            <DetailsButton class="minimal" meetingId={c.row.original.id} meetingType={c.row.original.typeDictId} />
            <MeetingDeleteButton
              class="minimal"
              meetingId={c.row.original.id}
              meetingType={c.row.original.typeDictId}
              meeting={c.row.original}
            />
          </PaddedCell>
        ),
        enableSorting: false,
        enableHiding: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
      columnGroups: "meeting",
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
      columnGroups: "meeting",
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
    columnGroups: "::attendant",
  } satisfies PartialColumnConfig<TQMeetingAttendanceResource>;
  const attendantsColumns = {
    attendanceType: {name: "attendant.attendanceTypeDictId", columnGroups: "attendant"},
    attendant: attendantColumn,
    attendantStaff: {
      ...attendantColumn,
      filterControl: (props) => <UuidSelectFilterControl {...props} {...modelQuerySpecs.userStaff()} />,
    },
    attendantClient: {
      ...attendantColumn,
      filterControl: (props) => <UuidSelectFilterControl {...props} {...modelQuerySpecs.userClient()} />,
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
      return system && invertFilter(system);
    },
  };
}
