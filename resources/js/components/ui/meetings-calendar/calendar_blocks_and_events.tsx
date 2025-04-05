import {CreateQueryResult} from "@tanstack/solid-query";
import {cx} from "components/utils/classnames";
import {MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {createCalendarRequestCreator, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {createTQuery} from "data-access/memo-api/tquery/tquery";
import {UserLink} from "features/facility-users/UserLink";
import {useMeetingsCache} from "features/meeting/meeting_api";
import {MeetingModalParams} from "features/meeting/meeting_modal";
import {WorkTimeModalParams} from "features/meeting/work_time_modal";
import {DateTime} from "luxon";
import {Accessor, createMemo, JSX, Show, Signal, untrack, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {TimeBlock} from "../calendar/calendar-columns/blocks";
import {DaysRange} from "../calendar/days_range";
import {AllDayTimeSpan, Block, CellStylingPreference, Event, PartDayTimeSpan} from "../calendar/types";
import {capitalizeString} from "../Capitalize";
import {facilityIcons} from "../icons";
import {CalendarFunction, CalendarMode} from "./calendar_modes";
import {CALENDAR_BACKGROUNDS, Coloring, NON_STAFF_PLANNED_MEETING_COLORING} from "./colors";
import {AllDayEventBlock, MeetingEventBlock} from "./column_events";
import {HoverableMeetingEventBlockProps} from "./HoverableMeetingEventBlock";
import {MonthDayMeetingEventBlock} from "./month_day_events";
import {TimeBlockSummary} from "./TimeBlockSummary";

export interface ColumnViewInfo {
  readonly day: DateTime;
  readonly resourceId: string;
}

export interface MonthViewInfo {
  readonly day: DateTime;
  readonly resourceId?: string;
}

export interface StaffInfo {
  readonly id: string;
  readonly plannedMeetingColoring: Coloring;
}

export interface WithOrigMeetingInfo {
  readonly meeting: TQMeetingResource;
}

type Bl = Block<ColumnViewInfo, MonthViewInfo> & WithOrigMeetingInfo;
type Ev = Event<ColumnViewInfo, MonthViewInfo> & WithOrigMeetingInfo;

/** The order in which blocks should appear in the all-day area and on month calendar. */
const ORDERS = {
  workTime: {
    facility: 22,
    staff: 21,
  },
  leaveTime: {
    facility: 12,
    staff: 11,
  },
} as const;

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
  calendarFunction,
  mode,
  daysRange,
  staffMap,
  meetingResources,
  blink,
  hoveredMeeting,
  allDayEventsHeight,
  monthEventsHeight,
  viewMeeting,
  viewWorkTime,
}: {
  calendarFunction: CalendarFunction;
  mode: Accessor<CalendarMode>;
  daysRange: Accessor<DaysRange>;
  staffMap: Accessor<ReadonlyMap<string, StaffInfo>>;
  meetingResources: Accessor<readonly string[]>;
  blink?: (meetingId: string) => HoverableMeetingEventBlockProps["blink"];
  hoveredMeeting?: Signal<string | undefined>;
  allDayEventsHeight?: Accessor<number>;
  monthEventsHeight?: Accessor<number>;
  viewMeeting: (params: MeetingModalParams) => void;
  viewWorkTime: (params: WorkTimeModalParams) => void;
}): {
  meetingsDataQuery: CreateQueryResult;
  blocks: () => readonly Bl[];
  events: () => readonly Ev[];
} {
  const t = useLangFunc();
  const meetingsCache = useMeetingsCache();
  const {meetingCategoryDict, meetingTypeDict} = useFixedDictionaries();
  const {dataQuery: meetingsDataQuery} = createTQuery({
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/meeting`,
    requestCreator: createCalendarRequestCreator({
      calendarFunction,
      daysRange: () =>
        mode() === "month"
          ? new DaysRange(
              daysRange().start.startOf("week", {useLocaleWeeks: true}),
              daysRange().end.endOf("week", {useLocaleWeeks: true}),
            )
          : daysRange(),
      staff: () => [...staffMap().keys()],
      meetingResources,
    }),
    dataQueryOptions: {refetchOnWindowFocus: true},
  });
  const meetings = () => meetingsDataQuery.data?.data as readonly TQMeetingResource[] | undefined;
  meetingsCache.register(meetings);
  const blocksAndEvents = createMemo(() => {
    let meetingsList = meetings();
    if (!meetingCategoryDict() || !meetingsList) {
      return {blocks: [], events: []};
    }
    const facilityWorkTimeBlocks: Bl[] = [];
    const staffWorkTimeBlocks: Bl[] = [];
    const facilityLeaveTimeBlocks: Bl[] = [];
    const staffLeaveTimeBlocks: Bl[] = [];
    const meetingEvents: Ev[] = [];
    if (calendarFunction === "leaveTimes") {
      // Ensure uniform order of staff leave times.
      meetingsList = meetingsList.toSorted((a, b) => (a.staff[0]?.name || "").localeCompare(b.staff[0]?.name || ""));
    }
    for (const meeting of meetingsList) {
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
      const hovered = () => meeting.id === hoveredMeeting?.[0]();
      /**
       * Returns an object defining props that are common for different block components, e.g. hover.
       * Properties are defined as getters to allow using the object as props.
       */
      function commonBlockProps() {
        return untrack(() =>
          Object.assign(
            calendarFunction === "timeTables"
              ? ({
                  onHoverChange(hovered: boolean) {
                    hoveredMeeting?.[1](hovered ? meeting.id : undefined);
                  },
                  get hovered() {
                    return hovered();
                  },
                } as const)
              : {},
            {
              onEditClick:
                calendarFunction === "timeTables" ? () => viewWorkTime({meeting, initialViewMode: true}) : undefined,
            } as const,
          ),
        );
      }
      if (meeting.typeDictId === meetingTypeDict()?.work_time.id) {
        if (meeting.isFacilityWide || calendarFunction !== "leaveTimes") {
          const style: JSX.CSSProperties = {
            background:
              CALENDAR_BACKGROUNDS[
                meeting.isFacilityWide && calendarFunction !== "leaveTimes" ? "facilityWorkTime" : "mainWorkTime"
              ],
          };
          const timeSpan = partDayTimeSpan();
          const stylingPreference: CellStylingPreference = {
            strength: BACKGROUND_PREFERENCE_STRENGTHS.workTime[meeting.isFacilityWide ? "facility" : "staff"],
            style,
          };
          const WorkTimeSummary: VoidComponent<htmlAttributes.div & {readonly day: DateTime}> = (props) => (
            <TimeBlockSummary
              {...props}
              timeSpan={timeSpan}
              style={style}
              label={(time) =>
                meeting.isFacilityWide ? (
                  <>
                    {time} <facilityIcons.Facility class="inlineIcon !mb-0.5" size="12" />
                  </>
                ) : (
                  time
                )
              }
              title={(time) =>
                `${t("with_colon", {
                  text: capitalizeString(
                    meeting.isFacilityWide ? t("calendar.facility_work_time") : meetingTypeDict()?.work_time.label,
                  ),
                })} ${time}`
              }
              {...commonBlockProps()}
            />
          );
          (meeting.isFacilityWide ? facilityWorkTimeBlocks : staffWorkTimeBlocks).push({
            meeting,
            ...timeSpan,
            contentInHoursArea: () => (
              <TimeBlock style={style} label={meeting.notes || undefined} hovered={hovered()} />
            ),
            contentInAllDayArea: meeting.isFacilityWide
              ? calendarFunction === "timeTables"
                ? (colInfo) => <WorkTimeSummary day={colInfo.day} class="text-grey-text" />
                : undefined
              : (colInfo) => <WorkTimeSummary day={colInfo.day} />,
            allDayAreaStylingPreference: stylingPreference,
            contentInMonthCell: meeting.isFacilityWide
              ? calendarFunction === "timeTables"
                ? (monthInfo) => <WorkTimeSummary day={monthInfo.day} class="text-grey-text" />
                : undefined
              : (monthInfo) => <WorkTimeSummary day={monthInfo.day} />,
            monthCellStylingPreference: stylingPreference,
            order: ORDERS.workTime[meeting.isFacilityWide ? "facility" : "staff"],
          });
        }
      } else if (meeting.typeDictId === meetingTypeDict()?.leave_time.id) {
        const style: JSX.CSSProperties = {
          background: CALENDAR_BACKGROUNDS[meeting.isFacilityWide ? "facilityLeaveTime" : "staffLeaveTime"],
        };
        const timeSpan = matchingTimeSpan();
        const shouldStyleCell = timeSpan.allDay && (meeting.isFacilityWide || calendarFunction !== "leaveTimes");
        const stylingPreference: CellStylingPreference | undefined = shouldStyleCell
          ? {
              strength: BACKGROUND_PREFERENCE_STRENGTHS.allDayLeaveTime[meeting.isFacilityWide ? "facility" : "staff"],
              style,
            }
          : undefined;
        const genericName = meeting.isFacilityWide
          ? t(timeSpan.allDay ? "calendar.facility_leave_time.all_day" : "calendar.facility_leave_time.part_day")
          : t("calendar.staff_leave_time");
        const LeaveTimeSummary: VoidComponent<{readonly day: DateTime}> = (props) => (
          <TimeBlockSummary
            day={props.day}
            timeSpan={timeSpan}
            // Skip the background if there is a background preference already as it will set the cell background anyway.
            class={cx(shouldStyleCell ? undefined : "border border-gray-300", "text-red-900")}
            style={shouldStyleCell ? undefined : style}
            label={(time) => (
              <>
                <Show when={calendarFunction === "leaveTimes" && !meeting.isFacilityWide}>
                  <UserLink
                    class="!text-black whitespace-nowrap"
                    type="staff"
                    userId={meeting.staff[0]!.userId}
                    newTabLink={false}
                  />
                </Show>
                <div>
                  <Show when={!timeSpan.allDay}>{time}</Show>{" "}
                  <Show when={meeting.isFacilityWide}>
                    <facilityIcons.Facility class="inlineIcon !mb-0.5" size="12" />
                  </Show>{" "}
                  {meeting.notes?.replaceAll("\n", ", ") || genericName}
                </div>
              </>
            )}
            title={(time) => (
              <>
                <Show when={calendarFunction === "leaveTimes"}>
                  <div class="mb-1">
                    <Show
                      when={meeting.isFacilityWide}
                      fallback={<UserLink type="staff" userId={meeting.staff[0]!.userId} link={false} />}
                    >
                      <facilityIcons.Facility class="inlineIcon" size="14" /> {t("meetings.facility_wide")}
                    </Show>
                  </div>
                </Show>
                <div>
                  <Show
                    when={meeting.isFacilityWide && timeSpan.allDay}
                    fallback={
                      <>
                        {t("with_colon", {text: capitalizeString(genericName)})} {time}
                      </>
                    }
                  >
                    {capitalizeString(genericName)}
                  </Show>
                </div>
                <Show when={meeting.notes}>
                  <div>{meeting.notes}</div>
                </Show>
              </>
            )}
            {...commonBlockProps()}
          />
        );
        (meeting.isFacilityWide ? facilityLeaveTimeBlocks : staffLeaveTimeBlocks).push({
          meeting,
          ...timeSpan,
          contentInHoursArea: () => (
            <TimeBlock class="text-red-900" style={style} label={meeting.notes || genericName} hovered={hovered()} />
          ),
          contentInAllDayArea: (colInfo) => <LeaveTimeSummary day={colInfo.day} />,
          allDayAreaStylingPreference: stylingPreference,
          contentInMonthCell: (monthInfo) => <LeaveTimeSummary day={monthInfo.day} />,
          monthCellStylingPreference: stylingPreference,
          order: ORDERS.leaveTime[meeting.isFacilityWide ? "facility" : "staff"],
        });
      } else if (meeting.categoryDictId !== meetingCategoryDict()?.system.id) {
        /**
         * Returns an object defining props that are common for different event components, e.g. colors, hover, blink.
         * Properties are defined as getters to allow using the object as props.
         */
        function commonEventProps(resourceId: string | undefined) {
          return untrack(() => ({
            get meeting() {
              return meeting;
            },
            get plannedColoring() {
              return (
                (resourceId && staffMap().get(resourceId)?.plannedMeetingColoring) || NON_STAFF_PLANNED_MEETING_COLORING
              );
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
            onClick: () => viewMeeting({staticMeetingId: meeting.id, initialViewMode: true}),
          }));
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
                {...commonEventProps(colInfo.resourceId)}
                height={allDayEventsHeight?.()}
              />
            ),
            contentInMonthCell: (monthInfo) => (
              <MonthDayMeetingEventBlock
                day={monthInfo.day}
                timeSpan={timeSpan}
                {...commonEventProps(monthInfo.resourceId)}
                height={monthEventsHeight?.()}
              />
            ),
          });
        } else {
          const timeSpan = partDayTimeSpan();
          meetingEvents.push({
            meeting,
            ...timeSpan,
            contentInHoursArea: (colInfo) => (
              <MeetingEventBlock day={colInfo.day} timeSpan={timeSpan} {...commonEventProps(colInfo.resourceId)} />
            ),
            contentInMonthCell: (monthInfo) => (
              <MonthDayMeetingEventBlock
                day={monthInfo.day}
                timeSpan={timeSpan}
                {...commonEventProps(monthInfo.resourceId)}
                height={monthEventsHeight?.()}
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
  });

  return {meetingsDataQuery, blocks: () => blocksAndEvents().blocks, events: () => blocksAndEvents().events};
}
