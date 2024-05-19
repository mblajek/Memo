import {createMutation} from "@tanstack/solid-query";
import {Button, DeleteButton} from "components/ui/Button";
import {RichTextView} from "components/ui/RichTextView";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, ShowCellVal, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {TextExportedCell, exportCellFunc, formatDateTimeForTextExport} from "components/ui/Table/table_export_cells";
import {UuidListSelectFilterControl} from "components/ui/Table/tquery_filters/UuidListSelectFilterControl";
import {UuidSelectFilterControl} from "components/ui/Table/tquery_filters/UuidSelectFilterControl";
import {createConfirmation} from "components/ui/confirmation";
import {ACTION_ICONS} from "components/ui/icons";
import {EM_DASH, EN_DASH, EmptyValueSymbol} from "components/ui/symbols";
import {htmlAttributes, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE, dayMinuteToHM, formatDayMinuteHM} from "components/utils/day_minute_util";
import {DATE_FORMAT} from "components/utils/formatting";
import {toastSuccess} from "components/utils/toast";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {TQMeetingAttendantResource, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {FilterH, invertFilter} from "data-access/memo-api/tquery/filter_utils";
import {ScrollableCell, TableColumnsSet} from "data-access/memo-api/tquery/table_columns";
import {Api} from "data-access/memo-api/types";
import {DateTime} from "luxon";
import {Index, Match, ParentComponent, Show, Switch, VoidComponent, splitProps} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {useFacilityUsersSelectParams} from "../facility-users/facility_users_select_params";
import {FacilityUserType} from "../facility-users/user_types";
import {MeetingInSeriesInfo, MeetingIntervalCommentText} from "./MeetingInSeriesInfo";
import {MeetingStatusTags, SimpleMeetingStatusTag} from "./MeetingStatusTags";
import {MeetingAttendanceStatus} from "./attendance_status_info";
import {createMeetingModal} from "./meeting_modal";

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
  const {attendanceTypeDict} = useFixedDictionaries();
  const meetingModal = createMeetingModal();
  const confirmation = createConfirmation();
  const facilityUsersSelectParams = useFacilityUsersSelectParams();
  const deleteMeetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
  }));
  const invalidate = useInvalidator();
  async function deleteMeeting(meetingId: string) {
    await deleteMeetingMutation.mutateAsync(meetingId);
    toastSuccess(t("forms.meeting_delete.success"));
    invalidate.facility.meetings();
  }

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
  const DetailsButton: ParentComponent<{meetingId: string | undefined} & htmlAttributes.button> = (allProps) => {
    const [props, buttonProps] = splitProps(allProps, ["meetingId", "children"]);
    return (
      <Show when={props.meetingId}>
        {(meetingId) => (
          <Button
            {...buttonProps}
            onClick={() =>
              meetingModal.show({meetingId: meetingId(), initialViewMode: true, showGoToMeetingButton: true})
            }
          >
            <ACTION_ICONS.details class="inlineIcon text-current !mb-[2px]" /> {props.children || t("actions.details")}
          </Button>
        )}
      </Show>
    );
  };

  const meetingColumns = {
    id: {name: "id", initialVisible: false},
    date: {name: "date", columnDef: {size: 190, sortDescFirst: true}},
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
          (v, ctx) =>
            `${formatDayMinuteHM(v)}-${formatDayMinuteHM((v + ctx.row.durationMinutes ?? 0) % MAX_DAY_MINUTE)}`,
        ),
      },
    },
    duration: {name: "durationMinutes", initialVisible: false, columnDef: {size: 120}},
    isInSeries: {
      name: "isClone",
      extraDataColumns: ["interval"],
      columnDef: {
        cell: cellFunc<boolean, TQFullMeetingResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>
              {(v) => (
                <>
                  {v() ? t("bool_values.yes") : t("bool_values.no")}{" "}
                  <span class="text-grey-text">
                    <MeetingIntervalCommentText interval={props.row.interval || undefined} />
                  </span>
                </>
              )}
            </ShowCellVal>
          </PaddedCell>
        )),
        size: 150,
      },
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
                    <MeetingIntervalCommentText interval={v()} />
                  </span>
                </div>
              )}
            </ShowCellVal>
          </PaddedCell>
        )),
        size: 120,
      },
    },
    category: {name: "categoryDictId", initialVisible: false},
    type: {name: "typeDictId"},
    status: {
      name: "statusDictId",
      columnDef: {
        cell: cellFunc<Api.Id, TQFullMeetingResource>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>{(v) => <SimpleMeetingStatusTag status={v()} />}</ShowCellVal>
          </PaddedCell>
        )),
        size: 200,
      },
    },
    statusTags: {
      name: "statusDictId",
      extraDataColumns: ["staff", "clients", "isRemote"],
      columnDef: {
        cell: cellFunc<string, TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <ShowCellVal v={props.v}>
              <MeetingStatusTags meeting={props.row} showPlannedTag />
            </ShowCellVal>
          </ScrollableCell>
        )),
      },
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
      filterControl: (props) => (
        <UuidListSelectFilterControl {...props} {...facilityUsersSelectParams.staffAndClientSelectParams()} />
      ),
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, TQMeetingAttendantResource[], TQFullMeetingResource>(
          (v, ctx) => ctx.row.attendants?.map((u) => u.name).join(", "),
        ),
      },
    },
    attendantsAttendance: {
      name: "attendants.*.attendanceStatusDictId",
      initialVisible: false,
    },
    attendantsCount: {
      name: "attendants.count",
      initialVisible: false,
    },
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
      filterControl: (props) => (
        <UuidListSelectFilterControl {...props} {...facilityUsersSelectParams.staffSelectParams()} />
      ),
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, TQMeetingAttendantResource[], TQFullMeetingResource>(
          (v, ctx) => ctx.row.staff.map((u) => u.name).join(", "),
        ),
      },
    },
    staffAttendance: {
      name: "staff.*.attendanceStatusDictId",
      initialVisible: false,
    },
    staffCount: {
      name: "staff.count",
      initialVisible: false,
    },
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
      filterControl: (props) => (
        <UuidListSelectFilterControl {...props} {...facilityUsersSelectParams.clientSelectParams()} />
      ),
      metaParams: {
        textExportCell: exportCellFunc<TextExportedCell, TQMeetingAttendantResource[], TQFullMeetingResource>(
          (v, ctx) => ctx.row.clients.map((u) => u.name).join(", "),
        ),
      },
    },
    clientsAttendance: {
      name: "clients.*.attendanceStatusDictId",
      initialVisible: false,
    },
    clientsCount: {
      name: "clients.count",
      initialVisible: false,
    },
    isRemote: {name: "isRemote"},
    notes: {
      name: "notes",
      columnDef: {
        cell: cellFunc<string, TQFullMeetingResource>((props) => (
          <ScrollableCell baseHeight={baseHeight}>
            <ShowCellVal v={props.v}>{(v) => <RichTextView text={v()} />}</ShowCellVal>
          </ScrollableCell>
        )),
      },
    },
    resources: {name: "resources.*.dictId"},
    actions: {
      name: "actions",
      isDataColumn: false,
      extraDataColumns: ["id"],
      columnDef: {
        cell: (c) => (
          <PaddedCell class="flex gap-1 h-min">
            <DetailsButton class="minimal" meetingId={c.row.original.id} />
            <DeleteButton
              class="minimal"
              confirm={() =>
                confirmation.confirm({
                  title: t("forms.meeting_delete.formName"),
                  body: t("forms.meeting_delete.confirmationText"),
                  confirmText: t("forms.meeting_delete.submit"),
                })
              }
              delete={() => deleteMeeting(c.row.original.id)}
            />
          </PaddedCell>
        ),
        enableSorting: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
    },
    dateTimeActions: {
      name: "date",
      extraDataColumns: ["startDayminute", "durationMinutes", "fromMeetingId", "interval", "id"],
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
    filterControl: (props) => (
      <UuidSelectFilterControl {...props} {...facilityUsersSelectParams.staffAndClientSelectParams()} />
    ),
    metaParams: {
      textExportCell: exportCellFunc<TextExportedCell, string, TQMeetingAttendanceResource>(
        (v, ctx) => ctx.row["attendant.name"],
      ),
    },
  } satisfies PartialColumnConfig<TQMeetingAttendanceResource>;
  const attendantsColumns = {
    attendanceType: {
      name: "attendant.attendanceTypeDictId",
    },
    attendant: attendantColumn,
    attendantClient: {
      ...attendantColumn,
      filterControl: (props) => (
        <UuidSelectFilterControl {...props} {...facilityUsersSelectParams.clientSelectParams()} />
      ),
    },
    attendanceStatus: {
      name: "attendant.attendanceStatusDictId",
      extraDataColumns: ["statusDictId"],
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
    },
  } satisfies Partial<Record<string, PartialColumnConfig<TQMeetingAttendanceResource>>>;
  return new TableColumnsSet({
    ...meetingColumns,
    ...attendantsColumns,
  });
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
