import {Button} from "components/ui/Button";
import {RichTextView} from "components/ui/RichTextView";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {ACTION_ICONS} from "components/ui/icons";
import {EM_DASH, EN_DASH} from "components/ui/symbols";
import {htmlAttributes, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE, formatDayMinuteHM} from "components/utils/day_minute_util";
import {DATE_FORMAT} from "components/utils/formatting";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingAttendantResource, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {Api} from "data-access/memo-api/types";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {DateTime} from "luxon";
import {For, ParentComponent, Show, VoidComponent, splitProps} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {MeetingStatusTags, SimpleMeetingStatusTag} from "./MeetingStatusTags";
import {MeetingAttendanceStatus} from "./attendance_status_info";
import {createMeetingModal} from "./meeting_modal";

export function useMeetingTableColumns() {
  const t = useLangFunc();
  const meetingModal = createMeetingModal();

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

  const columns = {
    id: {name: "id", initialVisible: false},
    date: {name: "date", columnDef: {size: 190}},
    time: {
      name: "startDayminute",
      extraDataColumns: ["durationMinutes"],
      columnDef: {
        cell: cellFunc<number>((v, c) => (
          <PaddedCell>
            <MeetingTime startDayMinute={v} durationMinutes={(c.row.original.durationMinutes as number) ?? 0} />
          </PaddedCell>
        )),
        sortDescFirst: false,
        enableColumnFilter: false,
        size: 120,
      },
    },
    duration: {name: "durationMinutes", initialVisible: false, columnDef: {size: 120}},
    category: {name: "categoryDictId", initialVisible: false},
    type: {name: "typeDictId"},
    status: {
      name: "statusDictId",
      columnDef: {
        cell: cellFunc<Api.Id>((v) => (
          <PaddedCell>
            <SimpleMeetingStatusTag status={v} />
          </PaddedCell>
        )),
        size: 200,
      },
    },
    statusTags: {
      name: "statusDictId",
      extraDataColumns: ["staff", "clients", "isRemote"],
      columnDef: {
        cell: cellFunc<string>((v, c) => (
          <Scrollable>
            <MeetingStatusTags
              meeting={c.row.original as Pick<TQMeetingResource, "statusDictId" | "staff" | "clients" | "isRemote">}
              showPlannedTag
            />
          </Scrollable>
        )),
      },
    },
    attendants: {
      name: "attendants",
      columnDef: {
        cell: cellFunc<TQMeetingAttendantResource[]>((v) => (
          <Scrollable class="flex flex-col gap-1">
            <UserLinks type="staff" users={v.filter((u) => u.attendanceType === "staff")} />
            <UserLinks type="clients" users={v.filter((u) => u.attendanceType === "client")} />
          </Scrollable>
        )),
      },
    },
    attendantsAttendance: {
      name: "attendants.*.attendanceStatusDictId",
      initialVisible: false,
    },
    staff: {
      name: "staff",
      columnDef: {
        cell: cellFunc<TQMeetingAttendantResource[]>((v) => (
          <Scrollable>
            <UserLinks type="staff" users={v} />
          </Scrollable>
        )),
      },
    },
    staffAttendance: {
      name: "staff.*.attendanceStatusDictId",
      initialVisible: false,
    },
    clients: {
      name: "clients",
      columnDef: {
        cell: cellFunc<TQMeetingAttendantResource[]>((v) => (
          <Scrollable>
            <UserLinks type="clients" users={v} />
          </Scrollable>
        )),
      },
    },
    clientsAttendance: {
      name: "clients.*.attendanceStatusDictId",
      initialVisible: false,
    },
    isRemote: {name: "isRemote"},
    notes: {
      name: "notes",
      columnDef: {
        cell: cellFunc<string>((v) => (
          <Scrollable>
            <RichTextView text={v} />
          </Scrollable>
        )),
      },
    },
    resources: {name: "resources.*.dictId"},
    createdAt: {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false},
    createdBy: {name: "createdBy.name", initialVisible: false},
    updatedAt: {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
    actions: {
      name: "actions",
      isDataColumn: false,
      extraDataColumns: ["id"],
      columnDef: {
        cell: (c) => (
          <PaddedCell>
            <DetailsButton class="minimal" meetingId={c.row.original.id as string} />
          </PaddedCell>
        ),
        enableSorting: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
    },
    dateTimeActions: {
      name: "date",
      extraDataColumns: ["startDayminute", "durationMinutes", "id"],
      columnDef: {
        cell: cellFunc<string>((v, c) => (
          <PaddedCell>
            <div class="flex gap-2 justify-between items-start">
              <div class="flex flex-col overflow-clip">
                <div>{DateTime.fromISO(v).toLocaleString({...DATE_FORMAT, weekday: "long"})}</div>
                <Show when={c.row.original.startDayminute as number | undefined}>
                  {(strtDayMinute) => (
                    <div>
                      <MeetingTime
                        startDayMinute={strtDayMinute()}
                        durationMinutes={(c.row.original.durationMinutes as number) ?? 0}
                      />
                    </div>
                  )}
                </Show>
              </div>
              <DetailsButton
                meetingId={c.row.original.id as string}
                class="shrink-0 secondary small"
                title={t("meetings.click_to_see_details")}
              >
                {t("meetings.show_details")}
              </DetailsButton>
            </div>
          </PaddedCell>
        )),
      },
    },
    // Attendance tables only:
    attendant: {
      name: "attendant.name",
      extraDataColumns: ["attendant.userId", "attendant.attendanceType"],
      columnDef: {
        cell: cellFunc<string>((v, c) => {
          const type = (): FacilityUserType | undefined => {
            const attendanceType = c.row.original["attendant.attendanceType"];
            if (!attendanceType) {
              return undefined;
            }
            switch (attendanceType) {
              case "staff":
                return "staff";
              case "client":
                return "clients";
              default:
                throw new Error(`Invalid attendance type: ${c.row.original["attendant.attendanceType"]}`);
            }
          };
          return (
            <PaddedCell>
              <Show when={type()}>
                {(type) => <UserLink type={type()} userId={c.row.original["attendant.userId"] as string} name={v} />}
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
        cell: cellFunc<string>((v, ctx) => (
          <PaddedCell>
            <MeetingAttendanceStatus attendanceStatusId={v} meetingStatusId={ctx.row.original.statusDictId as string} />
          </PaddedCell>
        )),
        size: 200,
      },
    },
  } satisfies Partial<Record<string, PartialColumnConfig>>;
  type KnownColumns = keyof typeof columns;
  return {
    columns,
    get: (
      ...cols: (KnownColumns | PartialColumnConfig | [KnownColumns, Partial<PartialColumnConfig>])[]
    ): PartialColumnConfig[] =>
      cols.map((c) => (typeof c === "string" ? columns[c] : Array.isArray(c) ? {...columns[c[0]], ...c[1]} : c)),
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
  readonly users: readonly TQMeetingAttendantResource[];
}

const UserLinks: VoidComponent<UserLinksProps> = (props) => {
  const {attendanceStatusDict} = useFixedDictionaries();
  return (
    <ul>
      <For each={props.users}>
        {({userId, name, attendanceStatusDictId}) => (
          <li>
            <UserLink type={props.type} icon userId={userId} name={name} />
            <Show when={attendanceStatusDictId !== attendanceStatusDict()?.ok.id}>
              {" "}
              <span class="text-grey-text">
                {EM_DASH} <MeetingAttendanceStatus attendanceStatusId={attendanceStatusDictId} />
              </span>
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
};
