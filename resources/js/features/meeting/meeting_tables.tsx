import {createMutation} from "@tanstack/solid-query";
import {Button, DeleteButton} from "components/ui/Button";
import {capitalizeString} from "components/ui/Capitalize";
import {RichTextView} from "components/ui/RichTextView";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, ShowCellVal, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {exportCellFunc, formatDateTimeForTextExport} from "components/ui/Table/table_export_cells";
import {createConfirmation} from "components/ui/confirmation";
import {ACTION_ICONS} from "components/ui/icons";
import {EMPTY_VALUE_SYMBOL, EM_DASH, EN_DASH} from "components/ui/symbols";
import {htmlAttributes, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE, dayMinuteToHM, formatDayMinuteHM} from "components/utils/day_minute_util";
import {DATE_FORMAT} from "components/utils/formatting";
import {objectRecursiveMerge} from "components/utils/object_merge";
import {toastSuccess} from "components/utils/toast";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {TQMeetingAttendantResource, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {FilterH, invertFilter} from "data-access/memo-api/tquery/filter_utils";
import {Api} from "data-access/memo-api/types";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {DateTime} from "luxon";
import {Index, ParentComponent, Show, VoidComponent, splitProps} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {MeetingStatusTags, SimpleMeetingStatusTag} from "./MeetingStatusTags";
import {MeetingAttendanceStatus} from "./attendance_status_info";
import {createMeetingModal} from "./meeting_modal";

export function useMeetingTableColumns() {
  const t = useLangFunc();
  const {attendanceTypeDict} = useFixedDictionaries();
  const meetingModal = createMeetingModal();
  const confirmation = createConfirmation();
  const deleteMeetingMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
  }));
  const invalidate = useInvalidator();
  async function deleteMeeting(meetingId: string) {
    await deleteMeetingMutation.mutateAsync(meetingId);
    toastSuccess(t("forms.meeting_delete.success"));
    invalidate.facility.meetings();
  }

  const MeetingTime: VoidComponent<{startDayMinute: number; durationMinutes: number}> = (props) => (
    <>
      {formatDayMinuteHM(props.startDayMinute, {hour: "2-digit"})} {EN_DASH}{" "}
      {formatDayMinuteHM((props.startDayMinute + props.durationMinutes) % MAX_DAY_MINUTE, {hour: "2-digit"})}
    </>
  );
  const DetailsButton: ParentComponent<{meetingId: string} & htmlAttributes.button> = (allProps) => {
    const [props, buttonProps] = splitProps(allProps, ["meetingId", "children"]);
    return (
      <Button {...buttonProps} onClick={() => meetingModal.show({meetingId: props.meetingId, initialViewMode: true})}>
        <ACTION_ICONS.details class="inlineIcon text-current !mb-[2px]" /> {props.children || t("actions.details")}
      </Button>
    );
  };

  const attendantsTextExport = exportCellFunc<string, TQMeetingAttendantResource[], TQMeetingResource>((v) =>
    v.map((u) => u.name).join(", "),
  );

  const columns = {
    ...({
      id: {name: "id", initialVisible: false},
      date: {name: "date", columnDef: {size: 190, sortDescFirst: true}},
      time: {
        name: "startDayminute",
        extraDataColumns: ["durationMinutes"],
        columnDef: {
          cell: cellFunc<number, TQMeetingResource>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.v}>
                {(v) => (
                  <MeetingTime startDayMinute={v()} durationMinutes={(props.row.durationMinutes as number) ?? 0} />
                )}
              </ShowCellVal>
            </PaddedCell>
          )),
          sortDescFirst: false,
          enableColumnFilter: false,
          size: 120,
        },
        metaParams: {
          textExportCell: exportCellFunc<string, number, TQMeetingResource>((v) => formatDayMinuteHM(v)),
        },
      },
      duration: {name: "durationMinutes", initialVisible: false, columnDef: {size: 120}},
      isInSeries: {name: "isClone"},
      seriesType: {name: "interval", initialVisible: false},
      category: {name: "categoryDictId", initialVisible: false},
      type: {name: "typeDictId"},
      status: {
        name: "statusDictId",
        columnDef: {
          cell: cellFunc<Api.Id, TQMeetingResource>((props) => (
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
          cell: cellFunc<string, TQMeetingResource>((props) => (
            <Scrollable>
              <ShowCellVal v={props.v}>
                <MeetingStatusTags
                  meeting={props.row as Pick<TQMeetingResource, "statusDictId" | "staff" | "clients" | "isRemote">}
                  showPlannedTag
                />
              </ShowCellVal>
            </Scrollable>
          )),
        },
        // TODO: Consider a custom textExportCell that includes all the status tags, not just the meeting status.
      },
      attendants: {
        // TODO: Make this column filterable by TQuerySelect.
        name: "attendants",
        columnDef: {
          cell: cellFunc<TQMeetingAttendantResource[], TQMeetingResource>((props) => (
            <Scrollable class="flex flex-col gap-1">
              <ShowCellVal v={props.v}>
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
            </Scrollable>
          )),
        },
        metaParams: {textExportCell: attendantsTextExport},
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
        // TODO: Make this column filterable by TQuerySelect.
        name: "staff",
        columnDef: {
          cell: cellFunc<TQMeetingAttendantResource[], TQMeetingResource>((props) => (
            <Scrollable>
              <UserLinks type="staff" users={props.v} />
            </Scrollable>
          )),
        },
        metaParams: {textExportCell: attendantsTextExport},
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
        // TODO: Make this column filterable by TQuerySelect.
        name: "clients",
        columnDef: {
          cell: cellFunc<TQMeetingAttendantResource[], TQMeetingResource>((props) => (
            <Scrollable>
              <UserLinks type="clients" users={props.v} />
            </Scrollable>
          )),
        },
        metaParams: {textExportCell: attendantsTextExport},
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
          cell: cellFunc<string, TQMeetingResource>((props) => (
            <Scrollable>
              <ShowCellVal v={props.v}>{(v) => <RichTextView text={v()} />}</ShowCellVal>
            </Scrollable>
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
              <DetailsButton class="minimal" meetingId={c.row.original.id as string} />
              <DeleteButton
                class="minimal"
                confirm={() =>
                  confirmation.confirm({
                    title: t("forms.meeting_delete.formName"),
                    body: t("forms.meeting_delete.confirmationText"),
                    confirmText: t("forms.meeting_delete.submit"),
                  })
                }
                delete={() => deleteMeeting(c.row.original.id as string)}
              />
            </PaddedCell>
          ),
          enableSorting: false,
          ...AUTO_SIZE_COLUMN_DEFS,
        },
      },
      dateTimeActions: {
        name: "date",
        extraDataColumns: ["startDayminute", "durationMinutes", "fromMeetingId", "id"],
        columnDef: {
          cell: cellFunc<string, TQMeetingResource>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.v}>
                {(v) => (
                  <div class="flex gap-2 justify-between items-start">
                    <div class="flex flex-col overflow-clip">
                      <div>{DateTime.fromISO(v()).toLocaleString({...DATE_FORMAT, weekday: "long"})}</div>
                      <Show when={props.row.startDayminute as number | undefined}>
                        {(strtDayMinute) => (
                          <div>
                            <MeetingTime
                              startDayMinute={strtDayMinute()}
                              durationMinutes={(props.row.durationMinutes as number) ?? 0}
                            />
                            <Show when={props.row.fromMeetingId}>
                              {" "}
                              <ACTION_ICONS.repeat
                                class="inlineIcon"
                                title={capitalizeString(t("meetings.meeting_is_in_series"))}
                              />
                            </Show>
                          </div>
                        )}
                      </Show>
                    </div>
                    <DetailsButton
                      meetingId={props.row.id as string}
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
          textExportCell: exportCellFunc<string, string, TQMeetingResource>((v, ctx) =>
            formatDateTimeForTextExport(DateTime.fromISO(v).set(dayMinuteToHM(ctx.row.startDayminute))),
          ),
        },
      },
    } satisfies Partial<Record<string, PartialColumnConfig<TQMeetingResource>>>),
    // Attendance tables only:
    attendanceType: {
      name: "attendant.attendanceTypeDictId",
    },
    attendant: {
      // TODO: Make this a user column filterable by TQuerySelect.
      name: "attendant.name",
      extraDataColumns: ["attendant.userId", "attendant.attendanceTypeDictId"],
      columnDef: {
        cell: cellFunc<string>((props) => {
          const type = (): FacilityUserType | undefined => {
            const attendanceType = props.row["attendant.attendanceTypeDictId"];
            if (!attendanceType) {
              return undefined;
            }
            switch (attendanceType) {
              case attendanceTypeDict()?.staff.id:
                return "staff";
              case attendanceTypeDict()?.client.id:
                return "clients";
              default:
                throw new Error("Invalid attendance type");
            }
          };
          return (
            <PaddedCell>
              <Show when={type()}>
                {(type) => <UserLink type={type()} userId={props.row["attendant.userId"] as string} name={props.v!} />}
              </Show>
            </PaddedCell>
          );
        }),
      },
    },
    attendanceStatus: {
      name: "attendant.attendanceStatusDictId",
      extraDataColumns: ["statusDictId"],
      columnDef: {
        cell: cellFunc<string>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>
              {(v) => (
                <MeetingAttendanceStatus attendanceStatusId={v()} meetingStatusId={props.row.statusDictId as string} />
              )}
            </ShowCellVal>
          </PaddedCell>
        )),
        size: 200,
      },
    },
  };
  type KnownColumns = keyof typeof columns;
  return {
    columns,
    get: (
      ...cols: (KnownColumns | PartialColumnConfig | [KnownColumns, Partial<PartialColumnConfig>])[]
    ): PartialColumnConfig[] =>
      cols.map((c) =>
        typeof c === "string"
          ? columns[c]
          : Array.isArray(c)
            ? objectRecursiveMerge<(typeof columns)[KnownColumns]>(columns[c[0]], c[1])
            : c,
      ),
  };
}

const Scrollable: ParentComponent<htmlAttributes.div> = (props) => (
  <PaddedCell class="overflow-auto">
    <div
      {...htmlAttributes.merge(props, {
        class: "wrapTextAnywhere max-h-20",
        style: {
          // Whatever this style means, it seems to work, i.e.:
          // - when there is little text, the row is allowed to shrink,
          // - when there is more text, the row grows to accommodate it,
          // - when there is a lot of text, the cell gets a scrollbar and the row doesn't grow,
          // - when the row is already higher because of other cells, the scrolling area grows to fit
          //   (possibly to the point when it no longer scrolls).
          "min-height": "max-content",
        },
      })}
    >
      {props.children}
    </div>
  </PaddedCell>
);

interface UserLinksProps {
  readonly type: FacilityUserType;
  readonly users: readonly TQMeetingAttendantResource[] | null | undefined;
}

const UserLinks: VoidComponent<UserLinksProps> = (props) => {
  const {attendanceStatusDict} = useFixedDictionaries();
  return (
    <Show when={props.users} fallback={EMPTY_VALUE_SYMBOL}>
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
