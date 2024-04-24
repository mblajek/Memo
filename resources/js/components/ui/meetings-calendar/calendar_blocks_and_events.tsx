import {CreateQueryResult} from "@tanstack/solid-query";
import {MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {useLocale} from "components/utils/LocaleContext";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {createCalendarRequestCreator, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {MeetingModalParams} from "features/meeting/meeting_modal";
import {DateTime} from "luxon";
import {Accessor, createMemo, Signal} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {TimeBlock} from "../calendar/calendar-columns/blocks";
import {DaysRange} from "../calendar/days_range";
import {AllDayTimeSpan, Block, Event, PartDayTimeSpan} from "../calendar/types";
import {WeekDaysCalculator} from "../calendar/week_days_calculator";
import {CalendarMode} from "./calendar_modes";
import {CALENDAR_BACKGROUNDS, Coloring, MISSING_MEETING_COLORING} from "./colors";
import {AllDayEventBlock, MeetingEventBlock} from "./column_events";
import {HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MonthDayMeetingEventBlock, MonthDayWorkTime} from "./month_day_events";

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
    const workTimeBlocks: Bl[] = [];
    const leaveTimeBlocks: Bl[] = [];
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
      if (meeting.typeDictId === meetingTypeDict()?.work_time.id) {
        const facilityWide = !meeting.staff.length;
        workTimeBlocks.push({
          meeting,
          ...partDayTimeSpan(),
          contentInHoursArea: () => (
            <TimeBlock
              style={{background: CALENDAR_BACKGROUNDS[facilityWide ? "facilityWorkTime" : "staffWorkTime"]}}
              label={meeting.notes || undefined}
              onEditClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: false})}
            />
          ),
          contentInAllDayArea: facilityWide ? undefined : () => "TODO",
          contentInMonthCell: facilityWide ? undefined : () => <MonthDayWorkTime meeting={meeting} />,
        });
      } else if (meeting.typeDictId === meetingTypeDict()?.leave_time.id) {
        const facilityWide = !meeting.staff.length;
        leaveTimeBlocks.push({
          meeting,
          ...partDayTimeSpan(),
          contentInHoursArea: () => (
            <TimeBlock
              style={{background: CALENDAR_BACKGROUNDS[facilityWide ? "facilityLeaveTime" : "staffLeaveTime"]}}
              label={meeting.notes || meetingTypeDict()?.leave_time.label}
              onEditClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: false})}
            />
          ),
          contentInAllDayArea: facilityWide ? undefined : () => "TODO",
          contentInMonthCell: facilityWide ? undefined : () => "TODO",
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
                entityId={meeting.id}
                onClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: true})}
              />
            ),
            contentInMonthCell: (monthInfo) => (
              <MonthDayMeetingEventBlock
                day={monthInfo.day}
                timeSpan={timeSpan}
                {...commonEventProps(monthInfo.staffId)}
                height={monthEventsHeight?.()}
                entityId={meeting.id}
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
                entityId={meeting.id}
                onClick={() => viewMeeting({meetingId: meeting.id, initialViewMode: true})}
              />
            ),
          });
        }
      }
    }
    return {
      blocks: [...workTimeBlocks, ...leaveTimeBlocks],
      events: meetingEvents,
    };
    // TODO: sort
  });

  return {meetingsDataQuery, blocks: () => blocksAndEvents().blocks, events: () => blocksAndEvents().events};
}
