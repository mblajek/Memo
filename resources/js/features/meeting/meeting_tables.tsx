import {EditButton} from "components/ui/Button";
import {RichTextView} from "components/ui/RichTextView";
import {AUTO_SIZE_COLUMN_DEFS, PaddedCell, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {SimpleTag} from "components/ui/Tag";
import {EN_DASH} from "components/ui/symbols";
import {htmlAttributes} from "components/utils";
import {formatDayMinuteHM} from "components/utils/day_minute_util";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {Api} from "data-access/memo-api/types";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {Index, ParentComponent, Show, VoidComponent} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {MeetingAttendanceStatus} from "./attendance_status_info";
import {createMeetingModal} from "./meeting_modal";

export function useMeetingTableColumns() {
  const meetingModal = createMeetingModal();
  const columns = {
    id: {name: "id", initialVisible: false},
    date: {name: "date", columnDef: {size: 190}},
    time: {
      name: "startDayminute",
      extraDataColumns: ["durationMinutes"],
      columnDef: {
        cell: (c) => {
          const startDayMinute = () => c.row.getValue<number>("startDayminute");
          const durationMinutes = () => c.row.getValue<number>("durationMinutes");
          return (
            <PaddedCell>
              {formatDayMinuteHM(startDayMinute(), {hour: "2-digit"})} {EN_DASH}{" "}
              {formatDayMinuteHM(startDayMinute() + durationMinutes(), {hour: "2-digit"})}
            </PaddedCell>
          );
        },
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
            <MeetingStatus status={v} />
          </PaddedCell>
        )),
        size: 200,
      },
    },
    staff: {
      name: "staff.*.name",
      extraDataColumns: ["staff.*.userId"],
      columnDef: {
        cell: cellFunc<Api.Id[]>((v, ctx) => (
          <UserLinksCell type="staff" userIds={ctx.row.getValue<string[]>("staff.*.userId")} names={v} />
        )),
      },
    },
    clients: {
      name: "clients.*.name",
      extraDataColumns: ["clients.*.userId"],
      columnDef: {
        cell: cellFunc<Api.Id[]>((v, ctx) => (
          <UserLinksCell type="clients" userIds={ctx.row.getValue<string[]>("clients.*.userId")} names={v} />
        )),
      },
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
            <EditButton onClick={() => meetingModal.show({meetingId: c.row.getValue("id")})} />
          </PaddedCell>
        ),
        enableSorting: false,
        ...AUTO_SIZE_COLUMN_DEFS,
      },
    },
    // Attendance tables only:
    attendant: {
      name: "attendant.name",
      extraDataColumns: ["attendant.userId", "attendant.attendanceType"],
      columnDef: {
        cell: (c) => {
          const type = () => {
            switch (c.row.getValue("attendant.attendanceType")) {
              case "staff":
                return "staff";
              case "client":
                return "clients";
              default:
                throw new Error(`Invalid attendance type: ${c.row.getValue("attendant.attendanceType")}`);
            }
          };
          return (
            <PaddedCell>
              <UserLink type={type()} userId={c.row.getValue("attendant.userId")} name={c.getValue<string>()} />
            </PaddedCell>
          );
        },
      },
    },
    attendanceStatus: {
      name: "attendant.attendanceStatusDictId",
      extraDataColumns: ["statusDictId"],
      columnDef: {
        cell: (c) => (
          <PaddedCell>
            <MeetingAttendanceStatus
              attendanceStatusId={c.getValue<string>()}
              meetingStatusId={c.row.getValue<string>("statusDictId")}
            />
          </PaddedCell>
        ),
        size: 200,
      },
    },
  } satisfies Partial<Record<string, PartialColumnConfig>>;
  return {
    columns,
    get: (...cols: (keyof typeof columns | PartialColumnConfig)[]) =>
      cols.map((c) => (typeof c === "string" ? columns[c] : c)),
  };
}

const Scrollable: ParentComponent<htmlAttributes.div> = (props) => (
  <PaddedCell {...htmlAttributes.merge(props, {class: "wrapTextAnywhere max-h-16 overflow-auto"})} />
);

interface UserLinksProps {
  readonly type: FacilityUserType;
  readonly userIds: readonly Api.Id[];
  readonly names: readonly string[];
}

const UserLinksCell: VoidComponent<UserLinksProps> = (props) => (
  <Scrollable>
    <ul>
      <Index each={props.userIds}>
        {(id, index) => (
          <li>
            <UserLink type={props.type} icon userId={id()} name={props.names[index]} />
          </li>
        )}
      </Index>
    </ul>
  </Scrollable>
);

interface StatusProps {
  readonly status: Api.Id;
}

export const MeetingStatus: VoidComponent<StatusProps> = (props) => {
  const dictionaries = useDictionaries();
  return (
    <Show when={dictionaries()}>
      {(dictionaries) => (
        <SimpleTag text={dictionaries()?.getPositionById(props.status).label} colorSeed={props.status} />
      )}
    </Show>
  );
};
