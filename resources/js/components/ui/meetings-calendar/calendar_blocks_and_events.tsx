import {CreateQueryResult} from "@tanstack/solid-query";
import {cx, NON_NULLABLE, useLangFunc} from "components/utils";
import {MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {useLocale} from "components/utils/LocaleContext";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {createCalendarRequestCreator, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {MeetingModalParams} from "features/meeting/meeting_modal";
import {DateTime} from "luxon";
import {Accessor, createMemo, JSX, Show, Signal, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {TimeBlock} from "../calendar/calendar-columns/blocks";
import {DaysRange} from "../calendar/days_range";
import {AllDayTimeSpan, Block, CellStylingPreference, Event, PartDayTimeSpan} from "../calendar/types";
import {WeekDaysCalculator} from "../calendar/week_days_calculator";
import {capitalizeString} from "../Capitalize";
import {CalendarMode} from "./calendar_modes";
import {CALENDAR_BACKGROUNDS, Coloring, MISSING_MEETING_COLORING} from "./colors";
import {AllDayEventBlock, MeetingEventBlock} from "./column_events";
import {HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MonthDayMeetingEventBlock} from "./month_day_events";
import {TimeBlockSummary} from "./TimeBlockSummary";

export interface ColumnViewInfo {
  readonly day: DateTime;
  readonly staffId: string;
}

export interface MonthViewInfo {
  readonly day: DateTime;
  readonly staffId: string;
}

interface StaffInfo {
  readonly id: string;
  readonly plannedMeetingColoring: Coloring;
}

export interface WithOrigMeetingInfo {
  readonly meeting: TQMeetingResource;
}

type Bl = Block<ColumnViewInfo, MonthViewInfo> & WithOrigMeetingInfo;
type Ev = Event<ColumnViewInfo, MonthViewInfo> & WithOrigMeetingInfo;

const BACKGROUND_PREFERENCE_STRENGTHS = {
  workTime: {
    facility: 11,
    staff: 12,
  },
  allDayLeaveTime: {
    facility: 21,
    staff: 22,
  },
} as const;

export function useCalendarBlocksAndEvents({
  mode,
  daysRange,
  staff,
  blink,
  hoveredMeeting,
  allDayEventsHeight,
  monthEventsHeight,
  viewMeeting,
}: {
  mode: Accessor<CalendarMode>;
  daysRange: Accessor<DaysRange>;
  staff: Accessor<readonly StaffInfo[]>;
  blink?: (meetingId: string) => HoverableMeetingEventBlockProps["blink"];
  hoveredMeeting?: Signal<string | undefined>;
  allDayEventsHeight?: Accessor<number>;
  monthEventsHeight?: Accessor<number>;
  viewMeeting: (params: MeetingModalParams) => void;
}): {
  meetingsDataQuery: CreateQueryResult;
  blocks: () => readonly Bl[];
  events: () => readonly Ev[];
} {
  const t = useLangFunc();
  const {meetingCategoryDict, meetingTypeDict} = useFixedDictionaries();
  const locale = useLocale();
  const staffMap = createMemo((): ReadonlyMap<string, StaffInfo> => {
    const res = new Map();
    for (const s of staff()) {
      res.set(s.id, s);
    }
    return res;
  });
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  const {dataQuery: meetingsDataQuery} = createTQuery({
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    entityURL: `facility/${activeFacilityId()}/meeting`,
    requestCreator: createCalendarRequestCreator({
      daysRange: () =>
        mode() === "month"
          ? new DaysRange(
              weekDaysCalculator.startOfWeek(daysRange().start),
              weekDaysCalculator.endOfWeek(daysRange().end),
            )
          : daysRange(),
      staff: () => [...staffMap().keys()],
    }),
    dataQueryOptions: {refetchOnWindowFocus: true},
  });
  const blocksAndEvents = createMemo(() => {
    if (!meetingCategoryDict() || !meetingsDataQuery.data) {
      return {blocks: [], events: []};
    }
    const facilityWorkTimeBlocks: Bl[] = [];
    const staffWorkTimeBlocks: Bl[] = [];
    const facilityLeaveTimeBlocks: Bl[] = [];
    const staffLeaveTimeBlocks: Bl[] = [];
    const meetingEvents: Ev[] = [];
    for (const meeting of meetingsDataQuery.data.data as readonly TQMeetingResource[]) {
      const date = DateTime.fromISO(meeting.date);
      const isAllDay = meeting.startDayminute === 0 && meeting.durationMinutes === MAX_DAY_MINUTE;
      const allDayTimeSpan = (): AllDayTimeSpan => ({
        allDay: true,
        range: DaysRange.oneDay(date),
      });
      const partDayTimeSpan = (): PartDayTimeSpan => ({
        allDay: false,
        date,
        startDayMinute: meeting.startDayminute,
        durationMinutes: meeting.durationMinutes,
      });
      const matchingTimeSpan = () => (isAllDay ? allDayTimeSpan() : partDayTimeSpan());
      if (meeting.typeDictId === meetingTypeDict()?.work_time.id) {
        const facilityWide = !meeting.staff.length;
        const style: JSX.CSSProperties = {
          background: CALENDAR_BACKGROUNDS[facilityWide ? "facilityWorkTime" : "staffWorkTime"],
        };
        const timeSpan = partDayTimeSpan();
        const stylingPreference: CellStylingPreference = {
          strength: BACKGROUND_PREFERENCE_STRENGTHS.workTime[facilityWide ? "facility" : "staff"],
          style,
        };
        const WorkTimeSummary: VoidComponent<{readonly day: DateTime}> = (props) => (
          <TimeBlockSummary
            day={props.day}
            timeSpan={timeSpan}
            style={style}
            title={(time) => `${t("with_colon", {text: capitalizeString(meetingTypeDict()?.work_time.label)})} ${time}`}
          />
        );
        (facilityWide ? facilityWorkTimeBlocks : staffWorkTimeBlocks).push({
          meeting,
          ...timeSpan,
          contentInHoursArea: () => (
            <TimeBlock
              style={style}
              label={meeting.notes || undefined}
              onEditClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: false})}
            />
          ),
          contentInAllDayArea: facilityWide ? undefined : (colInfo) => <WorkTimeSummary day={colInfo.day} />,
          allDayAreaStylingPreference: stylingPreference,
          contentInMonthCell: facilityWide ? undefined : (monthInfo) => <WorkTimeSummary day={monthInfo.day} />,
          monthCellStylingPreference: stylingPreference,
        });
      } else if (meeting.typeDictId === meetingTypeDict()?.leave_time.id) {
        const facilityWide = !meeting.staff.length;
        const style: JSX.CSSProperties = {
          background: CALENDAR_BACKGROUNDS[facilityWide ? "facilityLeaveTime" : "staffLeaveTime"],
        };
        const timeSpan = matchingTimeSpan();
        const stylingPreference: CellStylingPreference | undefined = timeSpan.allDay
          ? {
              strength: BACKGROUND_PREFERENCE_STRENGTHS.allDayLeaveTime[facilityWide ? "facility" : "staff"],
              style,
            }
          : undefined;
        const genericName = facilityWide
          ? t(timeSpan.allDay ? "calendar.facility_leave_time.all_day" : "calendar.facility_leave_time.part_day")
          : meetingTypeDict()?.leave_time.label;
        const LeaveTimeSummary: VoidComponent<{readonly day: DateTime}> = (props) => (
          <TimeBlockSummary
            day={props.day}
            timeSpan={timeSpan}
            // Skip the background if it's all day leave, which will set the background of the cell anyway.
            class={cx(timeSpan.allDay ? undefined : "border border-gray-300", "text-red-900")}
            style={timeSpan.allDay ? undefined : style}
            label={(time) => (
              <span>
                <Show when={!timeSpan.allDay}>{time} </Show>
                {meeting.notes?.replaceAll("\n", ", ") || genericName}
              </span>
            )}
            title={(time) =>
              [
                facilityWide && timeSpan.allDay
                  ? capitalizeString(genericName)
                  : `${t("with_colon", {text: capitalizeString(genericName)})} ${time}`,
                meeting.notes,
              ]
                .filter(NON_NULLABLE)
                .join("\n")
            }
          />
        );
        (facilityWide ? facilityLeaveTimeBlocks : staffLeaveTimeBlocks).push({
          meeting,
          ...timeSpan,
          contentInHoursArea: () => (
            <TimeBlock
              style={style}
              label={meeting.notes || genericName}
              onEditClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: false})}
            />
          ),
          contentInAllDayArea: (colInfo) => <LeaveTimeSummary day={colInfo.day} />,
          allDayAreaStylingPreference: stylingPreference,
          contentInMonthCell: (monthInfo) => <LeaveTimeSummary day={monthInfo.day} />,
          monthCellStylingPreference: stylingPreference,
        });
      } else if (meeting.categoryDictId !== meetingCategoryDict()?.system.id) {
        /**
         * Returns an object defining props that are common for different event components, e.g. colors, hover, blink.
         * Properties are defined as getters to allow using the object as props.
         */
        function commonEventProps(staffId: string) {
          return {
            get meeting() {
              return meeting;
            },
            get plannedColoring() {
              return staffMap().get(staffId)?.plannedMeetingColoring || MISSING_MEETING_COLORING;
            },
            get blink() {
              return blink?.(meeting.id);
            },
            onHoverChange(hovered: boolean) {
              hoveredMeeting?.[1](hovered ? meeting.id : undefined);
            },
            get hovered() {
              return meeting.id === hoveredMeeting?.[0]();
            },
            entityId: meeting.id,
          };
        }
        if (isAllDay) {
          const timeSpan = allDayTimeSpan();
          meetingEvents.push({
            meeting,
            ...timeSpan,
            contentInAllDayArea: (colInfo) => (
              <AllDayEventBlock
                day={colInfo.day}
                timeSpan={timeSpan}
                {...commonEventProps(colInfo.staffId)}
                height={allDayEventsHeight?.()}
                onClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: true})}
              />
            ),
            contentInMonthCell: (monthInfo) => (
              <MonthDayMeetingEventBlock
                day={monthInfo.day}
                timeSpan={timeSpan}
                {...commonEventProps(monthInfo.staffId)}
                height={monthEventsHeight?.()}
                onClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: true})}
              />
            ),
          });
        } else {
          const timeSpan = partDayTimeSpan();
          meetingEvents.push({
            meeting,
            ...timeSpan,
            contentInHoursArea: (colInfo) => (
              <MeetingEventBlock
                day={colInfo.day}
                timeSpan={timeSpan}
                {...commonEventProps(colInfo.staffId)}
                onClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: true})}
              />
            ),
            contentInMonthCell: (monthInfo) => (
              <MonthDayMeetingEventBlock
                day={monthInfo.day}
                timeSpan={timeSpan}
                {...commonEventProps(monthInfo.staffId)}
                height={monthEventsHeight?.()}
                onClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: true})}
              />
            ),
          });
        }
      }
    }
    return {
      blocks: [...facilityWorkTimeBlocks, ...staffWorkTimeBlocks, ...facilityLeaveTimeBlocks, ...staffLeaveTimeBlocks],
      events: meetingEvents,
    };
    // TODO: sort
  });

  return {meetingsDataQuery, blocks: () => blocksAndEvents().blocks, events: () => blocksAndEvents().events};
}
