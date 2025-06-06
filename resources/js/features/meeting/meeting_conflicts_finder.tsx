import {calendarIcons} from "components/ui/icons";
import {SmallSpinner} from "components/ui/Spinner";
import {title} from "components/ui/title";
import {cx} from "components/utils/classnames";
import {MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {debouncedAccessor} from "components/utils/debounce";
import {useLangFunc} from "components/utils/lang";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {dateToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";
import {
  BiRegularCalendarAlt,
  BiRegularCalendarCheck,
  BiRegularCalendarEvent,
  BiRegularCalendarExclamation,
} from "solid-icons/bi";
import {Accessor, For, VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";
import {activeFacilityId} from "state/activeFacilityId.state";
import {useAttendanceStatusesInfo} from "./attendance_status_info";
import {getMeetingTimeInterval} from "./meeting_time_controller";

type _Directives = typeof title;

/**
 * The information about the currently created/edited meeting to calculate conflicts for.
 *
 * The fields allow undefined values so that the conflicts finder is usable for a meeting create form, even before
 * all the time fields are set.
 */
interface MeetingData {
  /* The id of the meeting, if it is an existing meeting. This will prevent finding conflicts with itself. */
  readonly id?: string;
  readonly date: DateTime | undefined;
  readonly startDayMinute: number | undefined;
  readonly durationMinutes: number | undefined;
}

interface ConflictInfo {
  readonly conflictingFacilityLeaveTimes: readonly ConflictingLeaveTime[];
  readonly conflictingStaffLeaveTimes: readonly ConflictingLeaveTime[];
  readonly conflictingMeetings: readonly {readonly typeDictId: string}[];
  readonly outsideOfWorkTime: boolean;
}

interface ConflictingLeaveTime {
  readonly notes?: string;
}

/** The list of columns to fetch. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COLUMNS = [
  "id",
  "date",
  "startDayminute",
  "durationMinutes",
  "categoryDictId",
  "typeDictId",
  "statusDictId",
  "staff",
  "clients",
  "resources",
  "notes",
  "isRemote",
  "fromMeetingId",
  "interval",
] as const satisfies (keyof MeetingResource)[];

type Meeting = Pick<MeetingResource, (typeof COLUMNS)[number]>;

/**
 * Creates a meeting conflicts finder for the specified meeting.
 *
 * The result consists of a function for calculating conflicts for a particular staff member,
 * as well as a component that shows the conflicts information.
 */
export function useMeetingConflictsFinder(meetingData: Accessor<MeetingData>) {
  const t = useLangFunc();
  const {dictionaries, meetingCategoryDict, meetingTypeDict, meetingStatusDict} = useFixedDictionaries();
  const {presenceStatuses} = useAttendanceStatusesInfo();
  const debouncedDate = debouncedAccessor(() => meetingData().date);
  const conflictsQuery = createTQuery({
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/meeting`,
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    requestCreator: staticRequestCreator(() => {
      const date = debouncedDate();
      if (!date || !dictionaries()) {
        return undefined;
      }
      return {
        columns: [
          {type: "column", column: "id"},
          {type: "column", column: "isFacilityWide"},
          {type: "column", column: "staff"},
          {type: "column", column: "date"},
          {type: "column", column: "startDayminute"},
          {type: "column", column: "durationMinutes"},
          {type: "column", column: "categoryDictId"},
          {type: "column", column: "typeDictId"},
          {type: "column", column: "notes"},
        ],
        filter: {
          type: "op",
          op: "&",
          val: [
            {type: "column", column: "statusDictId", op: "=", val: meetingStatusDict()!.cancelled.id, inv: true},
            {type: "column", column: "date", op: ">=", val: dateToISO(date.minus({days: 1}))},
            {type: "column", column: "date", op: "<=", val: dateToISO(date.plus({days: 1}))},
          ],
        } satisfies FilterH,
        sort: [],
        paging: {size: 1000},
      };
    }),
  });
  type OtherMeeting = Meeting & {readonly isFacilityWide: boolean};
  const otherMeetings = () => conflictsQuery.dataQuery.data?.data as OtherMeeting[] | undefined;

  function getConflictsFor(staffId: string): ConflictInfo | "loading" | "unknown" {
    const {id, date, startDayMinute, durationMinutes} = meetingData();
    if (!date) {
      return "unknown";
    }
    if (conflictsQuery.dataQuery.isFetching || !otherMeetings()) {
      return "loading";
    }
    const isStartTimeKnown = startDayMinute !== undefined;
    const isAllDay = startDayMinute === 0 && durationMinutes === MAX_DAY_MINUTE;
    /**
     * The time of the main meeting, if known.
     * If the duration is not known, it is assumed 1 minute, to check conflicts for just the start time.
     * If the start time is not known, the time spans the whole day, but the conflict checks are different.
     */
    const interval = getMeetingTimeInterval(
      isStartTimeKnown
        ? {date, startDayMinute, durationMinutes: durationMinutes ?? 1}
        : {date, startDayMinute: 0, durationMinutes: MAX_DAY_MINUTE},
    );
    const conflictingFacilityLeaveTimes: {readonly notes?: string}[] = [];
    const conflictingStaffLeaveTimes: {readonly notes?: string}[] = [];
    const conflictingMeetings: {readonly typeDictId: string}[] = [];
    let outsideOfWorkTime = true;
    function isRelevantMeeting(meeting: OtherMeeting) {
      if (meeting.id === id) {
        return false;
      }
      if (meeting.isFacilityWide) {
        // Among the facility-wide meetings, only the leave times are relevant.
        return meeting.typeDictId === meetingTypeDict()!.leave_time.id;
      } else {
        const staffAttendanceStatus = meeting.staff.find(({userId}) => userId === staffId)?.attendanceStatusDictId;
        return staffAttendanceStatus && presenceStatuses()?.includes(staffAttendanceStatus);
      }
    }
    for (const otherMeeting of otherMeetings()!.filter(isRelevantMeeting)) {
      const otherInterval = getMeetingTimeInterval({
        date: DateTime.fromISO(otherMeeting.date),
        startDayMinute: otherMeeting.startDayminute,
        durationMinutes: otherMeeting.durationMinutes,
      });
      if (isStartTimeKnown) {
        if (isAllDay) {
          const wholeDay = interval;
          if (otherMeeting.typeDictId === meetingTypeDict()!.leave_time.id) {
            // Assume a full day meeting conflicts only with a full day leave time.
            if (otherInterval.engulfs(wholeDay)) {
              (otherMeeting.isFacilityWide ? conflictingFacilityLeaveTimes : conflictingStaffLeaveTimes).push({
                notes: otherMeeting.notes || undefined,
              });
            }
          } else if (otherMeeting.typeDictId === meetingTypeDict()!.work_time.id) {
            // Assume any work time is enough to participate in the all day meeting.
            if (wholeDay.overlaps(otherInterval)) {
              outsideOfWorkTime = false;
            }
          }
        } else {
          if (otherMeeting.typeDictId === meetingTypeDict()!.leave_time.id) {
            if (interval.overlaps(otherInterval)) {
              (otherMeeting.isFacilityWide ? conflictingFacilityLeaveTimes : conflictingStaffLeaveTimes).push({
                notes: otherMeeting.notes || undefined,
              });
            }
          } else if (otherMeeting.typeDictId === meetingTypeDict()!.work_time.id) {
            if (otherInterval.engulfs(interval)) {
              outsideOfWorkTime = false;
            }
          }
        }
        if (otherMeeting.categoryDictId !== meetingCategoryDict()!.system.id) {
          // All day meetings conflict with other meetings normally. This leads to some false positives in case of
          // very general meetings, but this is good enough.
          if (interval.overlaps(otherInterval)) {
            conflictingMeetings.push({typeDictId: otherMeeting.typeDictId});
          }
        }
      } else {
        const wholeDay = interval;
        if (otherMeeting.typeDictId === meetingTypeDict()!.leave_time.id) {
          // Conflict only if it is a full day leave time.
          if (otherInterval.engulfs(wholeDay)) {
            (otherMeeting.isFacilityWide ? conflictingFacilityLeaveTimes : conflictingStaffLeaveTimes).push({
              notes: otherMeeting.notes || undefined,
            });
          }
        } else if (otherMeeting.typeDictId === meetingTypeDict()!.work_time.id) {
          // Optimistically assume the meeting will fit in the work time if there is any work time in this day.
          if (wholeDay.overlaps(otherInterval)) {
            outsideOfWorkTime = false;
          }
        } else if (otherMeeting.categoryDictId !== meetingCategoryDict()!.system.id) {
          // All day meetings conflict with other meetings normally. This leads to some false positives in case of
          // very general meetings, but this is good enough.
          if (otherInterval.engulfs(wholeDay)) {
            conflictingMeetings.push({typeDictId: otherMeeting.typeDictId});
          }
        }
      }
    }
    // If the start time is not known, don't report "no conflict", but rather "unknown".
    if (
      !isStartTimeKnown &&
      !conflictingFacilityLeaveTimes.length &&
      !conflictingStaffLeaveTimes.length &&
      !conflictingMeetings &&
      !outsideOfWorkTime
    ) {
      return "unknown";
    }
    return {
      conflictingFacilityLeaveTimes,
      conflictingStaffLeaveTimes,
      conflictingMeetings,
      outsideOfWorkTime,
    };
  }

  interface ConflictsInfoProps {
    readonly userId: string | undefined;
  }

  const ConflictsInfo: VoidComponent<ConflictsInfoProps> = (props) => {
    const content = () => {
      const userId = props.userId;
      if (!userId) {
        return undefined;
      }
      const conflict = getConflictsFor(userId);
      if (conflict === "loading") {
        return (
          <div class="w-5 flex items-center">
            <SmallSpinner />
          </div>
        );
      }
      let iconType;
      let styleClass;
      let titleLines: string[];
      if (conflict === "unknown") {
        iconType = BiRegularCalendarAlt;
        styleClass = "text-black text-opacity-50";
        titleLines = [t("meetings.conflicts.unknown")];
      } else {
        iconType = BiRegularCalendarCheck;
        styleClass = "text-memo-active";
        titleLines = [t("meetings.conflicts.none")];
        const messages: string[] = [];
        if (conflict.outsideOfWorkTime) {
          iconType = BiRegularCalendarExclamation;
          styleClass = "text-yellow-600";
          messages.unshift(t("meetings.conflicts.outside_of_work_time"));
        }
        if (conflict.conflictingMeetings.length) {
          iconType = BiRegularCalendarEvent;
          styleClass = "text-yellow-600";
          messages.unshift(
            `${t("meetings.conflicts.with_other_meetings")} ${t("parenthesised", {
              text: conflict.conflictingMeetings
                .map(({typeDictId}) => dictionaries()!.getPositionById(typeDictId)?.label)
                .join(", "),
            })}`,
          );
        }
        function addConflictingLeaveTimesNote(
          conflictingLeaveTimes: readonly ConflictingLeaveTime[],
          messageKey: string,
        ) {
          if (conflictingLeaveTimes.length) {
            iconType = calendarIcons.Conflict;
            styleClass = "text-orange-600";
            let message = t(messageKey);
            const notes = conflictingLeaveTimes.map(({notes}) => notes?.replaceAll("\n", ", ")).filter(Boolean);
            if (notes.length) {
              message += ` ${t("parenthesised", {text: notes.join(", ")})}`;
            }
            messages.unshift(message);
          }
        }
        addConflictingLeaveTimesNote(
          conflict.conflictingFacilityLeaveTimes,
          "meetings.conflicts.with_facility_leave_time",
        );
        addConflictingLeaveTimesNote(conflict.conflictingStaffLeaveTimes, "meetings.conflicts.with_staff_leave_time");
        if (messages.length) {
          titleLines = messages;
        }
      }
      return (
        <div
          use:title={
            <ul class={titleLines.length > 1 ? "list-disc ms-2" : undefined}>
              <For each={titleLines}>{(line) => <li>{line}</li>}</For>
            </ul>
          }
        >
          <Dynamic component={iconType} class={cx(styleClass, "mb-1")} size="20" />
        </div>
      );
    };
    return <>{content()}</>;
  };

  return {
    getConflictsFor,
    ConflictsInfo,
  };
}
