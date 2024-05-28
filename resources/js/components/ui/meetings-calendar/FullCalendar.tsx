import {A, useLocation, useSearchParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {createLocalStoragePersistence} from "components/persistence/persistence";
import {richJSONSerialiser} from "components/persistence/serialiser";
import {CalendarColumn, ColumnsCalendar} from "components/ui/calendar/ColumnsCalendar";
import {MonthCalendar, MonthCalendarDay, getMonthCalendarRange} from "components/ui/calendar/MonthCalendar";
import {MonthCalendarCell} from "components/ui/calendar/MonthCalendarCell";
import {ResourceGroup, ResourceItem, ResourcesSelector} from "components/ui/calendar/ResourcesSelector";
import {TinyCalendar} from "components/ui/calendar/TinyCalendar";
import {AllDayArea} from "components/ui/calendar/calendar-columns/AllDayArea";
import {DayHeader} from "components/ui/calendar/calendar-columns/DayHeader";
import {HoursArea} from "components/ui/calendar/calendar-columns/HoursArea";
import {ResourceHeader} from "components/ui/calendar/calendar-columns/ResourceHeader";
import {DaysRange} from "components/ui/calendar/days_range";
import {WeekDaysCalculator} from "components/ui/calendar/week_days_calculator";
import {NON_NULLABLE, currentDate, cx, htmlAttributes, useLangFunc} from "components/utils";
import {useLocale} from "components/utils/LocaleContext";
import {DayMinuteRange, MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {createOneTimeEffect} from "components/utils/one_time_effect";
import {toastSuccess} from "components/utils/toast";
import {User} from "data-access/memo-api/groups";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {useAttendantsCreator} from "features/meeting/MeetingAttendantsFields";
import {MeetingBasicData} from "features/meeting/meeting_basic_data";
import {createMeetingCreateModal} from "features/meeting/meeting_create_modal";
import {MeetingModalParams, createMeetingModal} from "features/meeting/meeting_modal";
import {meetingTimeFullDayInitialValue, meetingTimePartDayInitialValue} from "features/meeting/meeting_time_controller";
import {createWorkTimeCreateModal} from "features/meeting/work_time_create_modal";
import {createWorkTimeModal} from "features/meeting/work_time_modal";
import {DateTime} from "luxon";
import {IoArrowBackOutline, IoArrowForwardOutline} from "solid-icons/io";
import {TbInfoTriangle} from "solid-icons/tb";
import {
  JSX,
  Match,
  Show,
  Signal,
  Switch,
  VoidComponent,
  batch,
  createComputed,
  createMemo,
  createSignal,
  mergeProps,
  on,
  onMount,
  splitProps,
} from "solid-js";
import {activeFacilityId, useActiveFacility} from "state/activeFacilityId.state";
import {Button} from "../Button";
import {Capitalize} from "../Capitalize";
import {SegmentedControl} from "../form/SegmentedControl";
import {STAFF_ICONS} from "../icons";
import {EN_DASH} from "../symbols";
import {title} from "../title";
import {WithOrigMeetingInfo, useCalendarBlocksAndEvents} from "./calendar_blocks_and_events";
import {CALENDAR_MODES, CalendarFunction, CalendarFunctionContext, CalendarMode} from "./calendar_modes";
import {CALENDAR_BACKGROUNDS, MISSING_MEETING_COLORING, coloringToStyle, getRandomEventColors} from "./colors";
import {CalendarLocationState, CalendarSearchParams} from "./meeting_link";

const _DIRECTIVES_ = null && title;

interface Props extends htmlAttributes.div {
  readonly staticCalendarFunction: CalendarFunction;
  readonly modes?: readonly CalendarMode[];
  readonly initialMode?: CalendarMode;
  readonly initialResourcesSelection?: readonly string[];
  readonly initialDay?: DateTime;
  /** The key to use for persisting the resources and days of the displayed page. If not present, selection is not persisted. */
  readonly staticSelectionPersistenceKey?: string;
  /** The key to use for persisting the presentation (view) settings. If not present, presentation settings are not persisted. */
  readonly staticPresentationPersistenceKey?: string;
}

const defaultProps = () =>
  ({
    modes: CALENDAR_MODES,
    initialMode: "week",
    initialResourcesSelection: [],
    initialDay: currentDate(),
  }) satisfies Partial<Props>;

const PIXELS_PER_HOUR_RANGE_WORK = {min: 40, max: 400, def: 120};
const PIXELS_PER_HOUR_RANGE_TIME_TABLES = {min: 20, max: 100, def: 40};
const ALL_DAY_EVENTS_HEIGHT_RANGE = {min: 15, max: 150, def: 30};
const MONTH_EVENTS_HEIGHT_RANGE = {min: 15, max: 150, def: 30};

/**
 * The state of the calendar persisted in the local storage.
 *
 * Warning: Changing this type may break the persistence and the whole application in a browser.
 * Either make sure the change is backwards compatible (allows reading earlier data),
 * or bump the version of the persistence.
 */
type PersistentSelectionState = {
  readonly today: string;
  readonly mode: CalendarMode;
  readonly daysSel: readonly (readonly [CalendarMode, DaysRange])[];
  readonly resourcesSel: {
    readonly checkbox: ReadonlySet<string>;
    readonly radio: string | null;
  };
};
const PERSISTENCE_SELECTION_VERSION = 3;

/**
 * The state of the calendar persisted in the local storage.
 *
 * Warning: Changing this type may break the persistence and the whole application in a browser.
 * Either make sure the change is backwards compatible (allows reading earlier data),
 * or bump the version of the persistence.
 */
type PersistentPresentationState = {
  readonly pixelsPerHour: number;
  readonly allDayEventsHeight: number;
  readonly monthEventsHeight: number;
};
const PERSISTENCE_PRESENTATION_VERSION = 3;

/**
 * A full-page calendar, consisting of a tiny calendar, a list of resources (people), calendar mode
 * switcher, and a large calendar with either month view, or hours view.
 */
export const FullCalendar: VoidComponent<Props> = (propsArg) => {
  const mProps = mergeProps(defaultProps(), propsArg);
  const [props, divProps] = splitProps(mProps, [
    "staticCalendarFunction",
    "modes",
    "initialMode",
    "initialResourcesSelection",
    "initialDay",
    "staticSelectionPersistenceKey",
    "staticPresentationPersistenceKey",
  ]);
  const t = useLangFunc();
  const locale = useLocale();
  const {attendantsInitialValueForCreate} = useAttendantsCreator();
  const meetingCreateModal = createMeetingCreateModal();
  const meetingModal = createMeetingModal();
  const workTimeCreateModal = createWorkTimeCreateModal();
  const workTimeModal = createWorkTimeModal();
  const location = useLocation<CalendarLocationState>();
  const activeFacility = useActiveFacility();
  const [searchParams, setSearchParams] = useSearchParams<CalendarSearchParams>();

  const PIXELS_PER_HOUR_RANGE = {
    work: PIXELS_PER_HOUR_RANGE_WORK,
    timeTables: PIXELS_PER_HOUR_RANGE_TIME_TABLES,
  }[props.staticCalendarFunction];

  const userStatus = createQuery(User.statusQueryOptions);
  const {dataQuery: staffDataQuery} = createTQuery({
    prefixQueryKey: FacilityStaff.keys.staff(),
    entityURL: `facility/${activeFacilityId()}/user/staff`,
    requestCreator: staticRequestCreator({
      columns: [
        {type: "column", column: "id"},
        {type: "column", column: "name"},
      ],
      sort: [{type: "column", column: "name", desc: false}],
      paging: {size: 1000},
    }),
  });
  const staff = () => staffDataQuery.data?.data as readonly {id: string; name: string}[];
  const staffResources = createMemo(
    () =>
      staff()?.map((staff) => {
        const coloring = getRandomEventColors(staff.id);
        return {
          id: staff.id,
          text: staff.name,
          coloring,
          label: () => (
            <div class="w-full py-1 flex justify-between gap-1 select-none">
              <span class="line-clamp-2" style={{"font-size": "0.92rem", "line-height": "1.15"}}>
                {staff.name}
              </span>
              <Show when={props.staticCalendarFunction === "work"}>
                <span
                  class="shrink-0 self-center border rounded"
                  style={{
                    width: "14px",
                    height: "14px",
                    ...coloringToStyle(coloring, {part: "colorMarker"}),
                  }}
                />
              </Show>
            </div>
          ),
        } satisfies ResourceItem & Record<string, unknown>;
      }) || [],
  );
  const staffResourcesById = createMemo(() => {
    const byId = new Map<string, ReturnType<typeof staffResources>[number]>();
    for (const resource of staffResources()) {
      byId.set(resource.id, resource);
    }
    return byId;
  });
  const resourceGroups = createMemo((): ResourceGroup[] => [
    {
      label: () => (
        <span class="font-bold select-none">
          <Capitalize text={t("models.staff._name_plural")} />
        </span>
      ),
      resources: staffResources(),
    },
  ]);

  const [mode, setMode] = createSignal(props.initialMode);
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  function getRange(day: DateTime, m = mode()) {
    switch (m) {
      case "month":
        return new DaysRange(day.startOf("month"), day.endOf("month"));
      case "week":
        return weekDaysCalculator.dayToWorkdays(day);
      case "day":
        return DaysRange.oneDay(day);
      default:
        return m satisfies never;
    }
  }
  const [tinyCalMonth, setTinyCalMonth] = createSignal(props.initialDay);
  // Initialise to whatever range, it will be immediately updated by the calendar.
  const [tinyCalVisibleRange, setTinyCalVisibleRange] = createSignal(DaysRange.oneDay(props.initialDay));
  const [visibleDayMinuteRange, setVisibleDayMinuteRange] = createSignal<DayMinuteRange>([0, 0]);

  /** The resources selection view, allowing multiple selection only in the day mode. */
  const resourcesSelectionMode = () => (mode() === "day" ? "checkbox" : "radio");

  const [selectedResourcesCheckbox, setSelectedResourcesCheckbox] = createSignal<ReadonlySet<string>>(
    new Set(props.initialResourcesSelection),
  );
  /** Returns the first resource from the specified set, in the order specified in props. */
  function getFirstResource(ids: ReadonlySet<string>) {
    if (!ids.size) {
      return undefined;
    }
    for (const resourceGroup of resourceGroups()) {
      for (const resource of resourceGroup.resources) {
        if (ids.has(resource.id)) {
          return resource.id;
        }
      }
    }
    return undefined;
  }
  // eslint-disable-next-line solid/reactivity
  const [selectedResourceRadio, setSelectedResourceRadio] = createSignal(getFirstResource(selectedResourcesCheckbox()));
  const selectedResources = createMemo(() =>
    resourcesSelectionMode() === "checkbox"
      ? selectedResourcesCheckbox()
      : new Set([selectedResourceRadio()].filter(NON_NULLABLE)),
  );
  function setSelectedResources(ids: ReadonlySet<string>) {
    if (resourcesSelectionMode() === "checkbox") {
      setSelectedResourcesCheckbox(ids);
    } else if (resourcesSelectionMode() === "radio") {
      if (ids.size > 1) {
        throw new Error(`Unexpected multiple selected resources in radio mode: ${[...ids].join(", ")}`);
      }
      setSelectedResourceRadio([...ids][0]);
    }
  }

  /** The last days selection in each of the modes. */
  const daysSelectionByMode = new Map<CalendarMode, Signal<DaysRange>>();
  for (const mode of CALENDAR_MODES) {
    // eslint-disable-next-line solid/reactivity
    const [daysRange, setDaysRange] = createSignal(getRange(props.initialDay, mode));
    // eslint-disable-next-line solid/reactivity
    daysSelectionByMode.set(mode, [daysRange, setDaysRange]);
  }

  const daysSelection = () => daysSelectionByMode.get(mode())![0]();
  /** Sets the selection and stores the value in daysSelectionByMode. */
  function setDaysSelection(range: DaysRange) {
    daysSelectionByMode.get(mode())![1](range);
  }

  /**
   * Sets the selected range, and if the previous selected range was visible, sets the month to contain
   * the new selection.
   */
  function setDaysSelectionAndMonth(range: DaysRange) {
    if (tinyCalVisibleRange().intersects(daysSelection())) {
      setTinyCalMonth(range.center());
    }
    setDaysSelection(range);
  }
  function setDaysSelectionAndMonthFromDay(day: DateTime) {
    setDaysSelectionAndMonth(getRange(day));
  }
  function moveDaysSelection(dir: 1 | -1) {
    // Use end of range to preserve week type.
    setDaysSelectionAndMonthFromDay(daysSelection().end.plus({[mode()]: dir}));
  }
  function goToToday() {
    let range;
    if (mode() === "week" && daysSelection().length() === 7) {
      // Keep the 7-day week.
      range = weekDaysCalculator.dayToWeek(currentDate());
    } else {
      range = getRange(currentDate());
    }
    setDaysSelectionAndMonth(range);
  }

  const [hoveredResource, setHoveredResource] = createSignal<string>();

  const [pixelsPerHour, setPixelsPerHour] = createSignal(PIXELS_PER_HOUR_RANGE.def);
  const [allDayEventsHeight, setAllDayEventsHeight] = createSignal(ALL_DAY_EVENTS_HEIGHT_RANGE.def);
  const [monthEventsHeight, setMonthEventsHeight] = createSignal(MONTH_EVENTS_HEIGHT_RANGE.def);
  function wheelWithAlt(e: WheelEvent, area: "allDay" | "hours" | "month") {
    if (area === "allDay") {
      setAllDayEventsHeight((v) =>
        Math.min(Math.max(v - 0.015 * e.deltaY, ALL_DAY_EVENTS_HEIGHT_RANGE.min), ALL_DAY_EVENTS_HEIGHT_RANGE.max),
      );
    } else if (area === "hours") {
      setPixelsPerHour((v) =>
        Math.min(Math.max(v * (1 - 0.0005) ** e.deltaY, PIXELS_PER_HOUR_RANGE.min), PIXELS_PER_HOUR_RANGE.max),
      );
    } else if (area === "month") {
      setMonthEventsHeight((v) =>
        Math.min(Math.max(v - 0.015 * e.deltaY, MONTH_EVENTS_HEIGHT_RANGE.min), MONTH_EVENTS_HEIGHT_RANGE.max),
      );
    } else {
      return area satisfies never;
    }
  }

  if (props.staticSelectionPersistenceKey) {
    createLocalStoragePersistence<PersistentSelectionState>({
      key: `FullCalendar:${props.staticSelectionPersistenceKey}`,
      value: () => ({
        today: currentDate().toISODate(),
        mode: mode(),
        daysSel: Array.from(daysSelectionByMode, ([mode, [sel]]) => [mode, sel()] as const),
        resourcesSel: {
          checkbox: selectedResourcesCheckbox(),
          radio: selectedResourceRadio() || null,
        },
      }),
      onLoad: (state) => {
        batch(() => {
          if (props.modes?.includes(state.mode)) {
            setMode(state.mode);
          }
          for (const [mode, daysSelection] of state.daysSel) {
            // Don't restore the selection if it contained the previous date, but not the current date.
            // In this situation the user probably prefers to see the current date.
            const day = DateTime.fromISO(state.today);
            if (!day.hasSame(currentDate(), "day")) {
              if (daysSelection.contains(day) && !daysSelection.contains(currentDate())) {
                continue;
              }
            }
            daysSelectionByMode.get(mode)?.[1](daysSelection);
          }
          setSelectedResourcesCheckbox(state.resourcesSel.checkbox);
          setSelectedResourceRadio(state.resourcesSel.radio || undefined);
          setTinyCalMonth(daysSelection().center());
        });
        // Once resources are loaded, make sure there aren't any selected resources that don't really exist.
        createOneTimeEffect({
          input: staff,
          effect: () => {
            const validResourceIds = new Set<string>();
            for (const {id} of staff()) {
              validResourceIds.add(id);
            }
            if (selectedResourceRadio() && !validResourceIds.has(selectedResourceRadio()!)) {
              setSelectedResourceRadio(undefined);
            }
            const resourcesCheckbox = new Set(selectedResourcesCheckbox());
            for (const id of resourcesCheckbox) {
              if (!validResourceIds.has(id)) {
                resourcesCheckbox.delete(id);
              }
            }
            if (resourcesCheckbox.size !== selectedResourcesCheckbox().size) {
              setSelectedResourcesCheckbox(resourcesCheckbox);
            }
          },
        });
      },
      serialiser: richJSONSerialiser<PersistentSelectionState>(),
      version: [PERSISTENCE_SELECTION_VERSION],
    });
  }
  if (props.staticPresentationPersistenceKey) {
    createLocalStoragePersistence<PersistentPresentationState>({
      key: `FullCalendar:${props.staticPresentationPersistenceKey}`,
      value: () => ({
        pixelsPerHour: pixelsPerHour(),
        allDayEventsHeight: allDayEventsHeight(),
        monthEventsHeight: monthEventsHeight(),
      }),
      onLoad: (state) => {
        batch(() => {
          setPixelsPerHour(state.pixelsPerHour || PIXELS_PER_HOUR_RANGE.def);
          setAllDayEventsHeight(state.allDayEventsHeight || ALL_DAY_EVENTS_HEIGHT_RANGE.def);
          setMonthEventsHeight(state.monthEventsHeight || MONTH_EVENTS_HEIGHT_RANGE.def);
        });
      },
      serialiser: richJSONSerialiser<PersistentPresentationState>(),
      version: [PERSISTENCE_PRESENTATION_VERSION],
    });
  }

  // Set the days selection when the mode is changed.
  createComputed(
    on(mode, (mode, prevMode) => {
      if (prevMode && mode !== prevMode) {
        // Update the selection for this mode if it does not overlap with the previous selection.
        const prevDaysSelection = daysSelectionByMode.get(prevMode)![0]();
        if (!prevDaysSelection?.intersects(daysSelection())) {
          // Calculate the new selection from the old selection (from different mode).
          if (mode === "month") {
            setDaysSelectionAndMonthFromDay(prevDaysSelection.center());
          } else if (mode === "week") {
            if (prevMode === "month") {
              // Never change tinyCalMonth when switching from month to week.
              if (daysSelectionByMode.get("week")?.[0]().length() === 7) {
                // Select a calendar week.
                setDaysSelection(weekDaysCalculator.dayToWeek(prevDaysSelection.start));
              } else {
                // Select the first work week of this month.
                for (const day of prevDaysSelection) {
                  if (!weekDaysCalculator.isWeekend(day)) {
                    setDaysSelection(weekDaysCalculator.dayToWorkdays(day));
                    break;
                  }
                }
              }
            } else {
              setDaysSelectionAndMonthFromDay(prevDaysSelection.start);
            }
          } else if (mode === "day") {
            setDaysSelectionAndMonthFromDay(prevDaysSelection.start);
          } else {
            return mode satisfies never;
          }
        }
      }
    }),
  );
  // Correct the resources selection if necessary when mode is changed.
  createComputed(
    on(resourcesSelectionMode, (mode, prevMode) => {
      if (prevMode && mode !== prevMode) {
        const selRadio = selectedResourceRadio();
        const noIntersection = !selRadio || !selectedResourcesCheckbox().has(selRadio);
        if (noIntersection) {
          if (mode === "checkbox") {
            // Add the radio selection to the checkbox selection.
            if (selRadio && !selectedResourcesCheckbox().has(selRadio)) {
              setSelectedResourcesCheckbox(new Set(selectedResourcesCheckbox()).add(selRadio));
            }
          } else if (mode === "radio") {
            // Select the first checkbox selection.
            setSelectedResourceRadio(getFirstResource(selectedResourcesCheckbox()));
          } else {
            return mode satisfies never;
          }
        }
      }
    }),
  );

  /** Returns the UI text describing the selected days range. */
  function getDaysSelectionText() {
    const m = mode();
    switch (m) {
      case "month":
        return daysSelection().start.toLocaleString({month: "long", year: "numeric"});
      case "week": {
        const fitsInMonth = daysSelection().start.hasSame(daysSelection().end, "month");
        const fitsInYear = fitsInMonth || daysSelection().start.hasSame(daysSelection().end, "year");
        return `${daysSelection().start.toLocaleString({
          day: "numeric",
          month: fitsInMonth ? undefined : "long",
          year: fitsInYear ? undefined : "numeric",
        })} ${EN_DASH} ${daysSelection().end.toLocaleString({day: "numeric", month: "long", year: "numeric"})}`;
      }
      case "day":
        return daysSelection().start.toLocaleString({weekday: "long", day: "numeric", month: "long", year: "numeric"});
      default:
        return m satisfies never;
    }
  }

  const [blinkingMeetings, setBlinkingMeetings] = createSignal<ReadonlyMap<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  function blinkMeeting(meetingId: string) {
    clearTimeout(blinkingMeetings().get(meetingId));
    setBlinkingMeetings((map) =>
      new Map(map).set(
        meetingId,
        setTimeout(
          () => {
            setBlinkingMeetings((map) => {
              const modified = new Map(map);
              modified.delete(meetingId);
              return modified;
            });
          },
          // Give enough time for the calendar to fetch the event if it is new.
          3000,
        ),
      ),
    );
  }
  const [hoveredMeeting, setHoveredMeeting] = createSignal<string>();

  const {meetingsDataQuery, blocks, events} = useCalendarBlocksAndEvents({
    calendarFunction: props.staticCalendarFunction,
    mode,
    daysRange: daysSelection,
    staff: () =>
      // eslint-disable-next-line solid/reactivity
      Array.from(selectedResources(), (id) => ({
        id,
        plannedMeetingColoring: staffResourcesById().get(id)?.coloring || MISSING_MEETING_COLORING,
      })),
    blink: (meetingId) => (isCalendarLoading() ? false : blinkingMeetings().get(meetingId)),
    hoveredMeeting: [hoveredMeeting, setHoveredMeeting],
    allDayEventsHeight,
    monthEventsHeight,
    viewMeeting,
    viewWorkTime: (params) => workTimeModal.show(params),
  });

  function meetingChangeEffects(message: JSX.Element, meeting: MeetingBasicData, otherMeetingIds?: string[]) {
    blinkMeeting(meeting.id);
    for (const id of otherMeetingIds || []) {
      blinkMeeting(id);
    }
    toastSuccess(() => (
      <div class="flex gap-2 items-baseline">
        <span>{message}</span>
        <Button class="secondary small" onClick={() => goToMeeting(meeting)}>
          {t("actions.show")}
        </Button>
      </div>
    ));
  }

  function goToMeeting(meeting: MeetingBasicData) {
    const meetingDate = DateTime.fromISO(meeting.date);
    if (!daysSelection().contains(meetingDate)) {
      setDaysSelectionAndMonthFromDay(meetingDate);
    }
    if (meeting.staff.length) {
      if (mode() === "day") {
        const selectedResources = new Set(selectedResourcesCheckbox());
        for (const {userId} of meeting.staff) {
          selectedResources.add(userId);
        }
        setSelectedResourcesCheckbox(selectedResources);
      } else if (!meeting.staff.some((staff) => staff.userId === selectedResourceRadio())) {
        setSelectedResourceRadio(meeting.staff[0]!.userId);
      }
    }
    if (
      mode() === "month" ||
      // This condition is not ideal as we are not sure the meeting produces a block in the all day area,
      // but we cannot check this at this point.
      (meeting.startDayminute === 0 && meeting.durationMinutes === MAX_DAY_MINUTE)
    ) {
      nativeScrollIntoView(meeting.id);
    } else {
      scrollIntoView(meeting.startDayminute, meeting.durationMinutes);
    }
    blinkMeeting(meeting.id);
  }
  /** Scroll to the element representing the specified meeting or block. Find the element using the data-entity-id attribute. */
  function nativeScrollIntoView(entityId: string) {
    let attemptsLeft = 5;
    function attempt() {
      const elements = document.querySelectorAll(`[data-entity-id="${entityId}"]`);
      if (elements.length)
        for (const elem of elements) {
          elem.scrollIntoView({behavior: "smooth", block: "nearest"});
        }
      else if (--attemptsLeft) {
        // If the element doesn't exist yet, try again after a moment.
        setTimeout(attempt, 300);
      }
    }
    attempt();
  }

  const SCROLL_MARGIN_PIXELS = 20;
  const scrollMarginMinutes = createMemo(() => Math.round((SCROLL_MARGIN_PIXELS / pixelsPerHour()) * 60));
  const [scrollToDayMinute, setScrollToDayMinute] = createSignal<number>();
  function scrollIntoView(start: number, duration = 0) {
    const [currScrollStart, currScrollEnd] = visibleDayMinuteRange();
    const scrollLen = currScrollEnd - currScrollStart;
    let scroll = currScrollStart;
    scroll = Math.max(scroll, Math.min(start + duration, MAX_DAY_MINUTE) + scrollMarginMinutes() - scrollLen);
    scroll = Math.min(scroll, start - scrollMarginMinutes());
    if (scroll !== currScrollStart) {
      setScrollToDayMinute(undefined);
      setTimeout(() => setScrollToDayMinute(scroll));
    }
  }
  onMount(() => {
    scrollIntoView(7 * 60, 1e3);
  });
  const meetingToShowFromLocationState = () => location.state?.meetingToShow;
  const meetingToShowQuery = createQuery(() => ({
    enabled: !!searchParams.meetingId && !meetingToShowFromLocationState(),
    ...FacilityMeeting.meetingQueryOptions(searchParams.meetingId || ""),
  }));
  createOneTimeEffect({
    input: () => meetingToShowFromLocationState() || meetingToShowQuery.data,
    effect: (meeting) => {
      setSearchParams({meetingId: undefined});
      history.replaceState({...history.state, meetingToShow: undefined}, "");
      // Give the calendar time to scroll to the initial position first.
      setTimeout(() => goToMeeting(meeting), 100);
    },
  });

  function filterByStaff<T extends WithOrigMeetingInfo>(items: readonly T[], staffId: string) {
    return items.filter((item) => !item.meeting.staff.length || item.meeting.staff.some((s) => s.userId === staffId));
  }

  function getCalendarColumnPart(day: DateTime, staffId: string) {
    const staffBlocks = createMemo(() => filterByStaff(blocks(), staffId));
    const staffEvents = createMemo(() => filterByStaff(events(), staffId));
    return {
      day,
      allDayArea: () => (
        <AllDayArea
          style={{background: CALENDAR_BACKGROUNDS.main}}
          day={day}
          columnViewInfo={{day, staffId}}
          blocks={staffBlocks()}
          events={staffEvents()}
          onEmptyClick={() => {
            if (props.staticCalendarFunction === "work") {
              meetingCreateModal.show({
                initialValues: {
                  ...meetingTimeFullDayInitialValue(day),
                  ...attendantsInitialValueForCreate([staffId]),
                },
                onSuccess: (meeting) => meetingChangeEffects(t("forms.meeting_create.success"), meeting),
                showToast: false,
              });
            } else if (props.staticCalendarFunction === "timeTables") {
              workTimeCreateModal.show({
                initialValues: {
                  ...meetingTimeFullDayInitialValue(day),
                  staff: staffId,
                },
              });
            } else {
              return props.staticCalendarFunction satisfies never;
            }
          }}
        />
      ),
      hoursArea: () => (
        <HoursArea
          style={{background: CALENDAR_BACKGROUNDS.main}}
          day={day}
          columnViewInfo={{day, staffId}}
          blocks={staffBlocks()}
          events={staffEvents()}
          onTimeClick={(time) => {
            if (props.staticCalendarFunction === "work") {
              meetingCreateModal.show({
                initialValues: {
                  ...meetingTimePartDayInitialValue(time),
                  ...attendantsInitialValueForCreate([staffId]),
                },
                onSuccess: (meeting, cloneIds) =>
                  meetingChangeEffects(
                    t(cloneIds?.length ? "forms.meeting_series_create.success" : "forms.meeting_create.success"),
                    meeting,
                    cloneIds,
                  ),
                showToast: false,
              });
            } else if (props.staticCalendarFunction === "timeTables") {
              workTimeCreateModal.show({
                initialValues: {
                  ...meetingTimePartDayInitialValue(time),
                  staff: staffId,
                },
              });
            } else {
              return props.staticCalendarFunction satisfies never;
            }
          }}
        />
      ),
    } satisfies Partial<CalendarColumn>;
  }

  const calendarColumns = createMemo((): CalendarColumn[] => {
    const m = mode();
    switch (m) {
      case "month":
        // The columns calendar is not displayed in this mode anyway.
        return [];
      case "week": {
        const staff = selectedResourceRadio();
        if (!staff) {
          return [];
        }
        return Array.from(daysSelection(), (day) => ({
          header: () => (
            <DayHeader
              day={day}
              onDateClick={() => {
                setMode("day");
                setDaysSelectionAndMonthFromDay(day);
              }}
            />
          ),
          ...getCalendarColumnPart(day, staff),
        }));
      }
      case "day": {
        const day = daysSelection().start;
        return staffResources()
          .map(({id, text}) =>
            selectedResources().has(id)
              ? {
                  header: () => (
                    <ResourceHeader
                      label={() => (
                        <Button
                          class={cx("rounded hover:underline", id === hoveredResource() ? "bg-hover" : undefined)}
                          onClick={() => {
                            setMode("week");
                            setDaysSelectionAndMonthFromDay(day);
                            setSelectedResourceRadio(id);
                          }}
                          title={`${text}\n${t("calendar.click_for_staff_calendar")}`}
                        >
                          <span class="line-clamp-3">{text}</span>
                        </Button>
                      )}
                    />
                  ),
                  ...getCalendarColumnPart(day, id),
                }
              : undefined,
          )
          .filter(NON_NULLABLE);
      }
      default:
        return m satisfies never;
    }
  });

  const monthCalendarDays = createMemo((): MonthCalendarDay[] => {
    if (mode() !== "month") {
      return [];
    }
    const staffId = staffResources().find(({id}) => selectedResources().has(id))?.id;
    if (!staffId) {
      return [];
    }
    const daysRange = getMonthCalendarRange(weekDaysCalculator, daysSelection().start);
    return Array.from(daysRange, (day) => ({
      day,
      content: () => (
        <MonthCalendarCell
          month={daysSelection().start}
          day={day}
          monthViewInfo={{day, staffId}}
          blocks={filterByStaff(blocks(), staffId)}
          events={filterByStaff(events(), staffId)}
          style={{background: CALENDAR_BACKGROUNDS.main}}
          onDateClick={() => {
            setMode("week");
            setDaysSelectionAndMonthFromDay(day);
          }}
          onEmptyClick={() => {
            if (props.staticCalendarFunction === "work") {
              meetingCreateModal.show({
                initialValues: {
                  date: day.toISODate(),
                  ...attendantsInitialValueForCreate(staffId ? [staffId] : undefined),
                },
                onSuccess: (meeting) => meetingChangeEffects(t("forms.meeting_create.success"), meeting),
                showToast: false,
              });
            } else if (props.staticCalendarFunction === "timeTables") {
              workTimeCreateModal.show({
                initialValues: {
                  ...meetingTimeFullDayInitialValue(day),
                  staff: staffId,
                },
              });
            } else {
              return props.staticCalendarFunction satisfies never;
            }
          }}
        />
      ),
    }));
  });

  function viewMeeting(params: MeetingModalParams) {
    meetingModal.show({
      ...params,
      showToast: false,
      onEdited: (meeting) => meetingChangeEffects(t("forms.meeting_edit.success"), meeting),
      onCreated: (meeting) => meetingChangeEffects(t("forms.meeting_create.success"), meeting),
      onCloned: (meeting, otherMeetingIds) =>
        meetingChangeEffects(t("forms.meeting_series_create.success"), meeting, otherMeetingIds),
      onDeleted: () => toastSuccess(t("forms.meeting_delete.success")),
    });
  }

  // TODO: Don't show the loading pane when refetching in the background.
  const isCalendarLoading = () => {
    if (meetingsDataQuery.isFetching) {
      return true;
    }
    if (mode() !== "month" && !calendarColumns().length) {
      return true;
    }
    return false;
  };

  return (
    <CalendarFunctionContext.Provider value={props.staticCalendarFunction}>
      <div {...htmlAttributes.merge(divProps, {class: "flex items-stretch gap-1"})}>
        <div class="flex flex-col items-stretch gap-1" style={{"flex-basis": "min-content"}}>
          <TinyCalendar
            showWeekdayNames
            selection={daysSelection()}
            month={tinyCalMonth()}
            setMonth={setTinyCalMonth}
            getHoverRange={getRange}
            onDayClick={(day, range) => {
              setTinyCalMonth(day);
              setDaysSelection(range!);
            }}
            onDayDoubleClick={(day) => {
              // Switch between day and week modes.
              batch(() => {
                setMode(mode() === "day" ? "week" : "day");
                setDaysSelectionAndMonthFromDay(day);
              });
            }}
            onMonthNameClick={() => {
              batch(() => {
                setMode("month");
                setDaysSelection(getRange(tinyCalMonth()));
              });
            }}
            onVisibleRangeChange={setTinyCalVisibleRange}
          />
          <Show when={props.staticCalendarFunction === "work" && userStatus.data?.permissions.facilityStaff}>
            <div class="mx-1 flex gap-1 items-stretch">
              <Button
                class={cx("grow", selectedResources().size ? "minimal" : "primary small")}
                onClick={() => {
                  if (mode() === "day") {
                    setMode("week");
                  }
                  setSelectedResourceRadio(userStatus.data!.user.id);
                }}
                disabled={
                  (mode() === "month" || mode() === "week") && selectedResources().has(userStatus.data!.user.id)
                }
              >
                {t("calendar.show_my_calendar")}
              </Button>
              <div use:title={t("calendar.show_my_details")}>
                <A
                  href={`/${activeFacility()?.url}/staff/${userStatus.data?.user.id}`}
                  role="button"
                  class="w-full h-full minimal flex items-center"
                >
                  <STAFF_ICONS.staff class="text-gray-700" />
                </A>
              </div>
            </div>
          </Show>
          <ResourcesSelector
            class="overflow-y-auto"
            resourceGroups={resourceGroups()}
            mode={resourcesSelectionMode()}
            selection={selectedResources()}
            onSelectionChange={setSelectedResources}
            onHover={setHoveredResource}
          />
        </div>
        <div class="min-w-0 grow flex flex-col items-stretch gap-3">
          <div class="pt-1 pr-1 flex items-stretch gap-1">
            <div class="flex">
              <Button class="h-full secondary small !rounded-r-none" onClick={[moveDaysSelection, -1]}>
                <IoArrowBackOutline class="text-current" />
              </Button>
              <Button
                class="h-full secondary small !rounded-l-none"
                style={{"margin-left": "-1px"}}
                onClick={[moveDaysSelection, 1]}
              >
                <IoArrowForwardOutline class="text-current" />
              </Button>
            </div>
            <Button class="secondary small" onClick={goToToday} disabled={daysSelection().contains(currentDate())}>
              <Capitalize text={t("calendar.today")} />
            </Button>
            <div class="grow self-center text-center text-lg text-ellipsis">
              <Capitalize text={getDaysSelectionText()} />
            </div>
            <SegmentedControl
              name="calendarMode"
              value={mode()}
              onValueChange={setMode}
              items={props.modes.map((m) => ({value: m, label: () => t(`calendar.units.${m}`)}))}
              small
            />
          </div>
          <Switch>
            <Match when={!selectedResources().size}>
              <div class="mx-2 my-6 flex justify-center gap-1">
                <TbInfoTriangle size={20} class="text-memo-active" />
                {t("calendar.select_resource_to_show_calendar")}
              </div>
            </Match>
            <Match when={mode() === "month"}>
              <MonthCalendar
                class="h-full min-h-0 pb-1"
                month={daysSelection().start}
                days={monthCalendarDays()}
                isLoading={isCalendarLoading()}
                onWheelWithAlt={(e) => wheelWithAlt(e, "month")}
              />
            </Match>
            <Match when="fallback">
              <ColumnsCalendar
                class="h-full min-h-0"
                isLoading={isCalendarLoading()}
                columns={calendarColumns()}
                pixelsPerHour={pixelsPerHour()}
                gridCellMinutes={{work: 15, timeTables: 60}[props.staticCalendarFunction]}
                onVisibleRangeChange={setVisibleDayMinuteRange}
                scrollToDayMinute={scrollToDayMinute()}
                onWheelWithAlt={wheelWithAlt}
              />
            </Match>
          </Switch>
        </div>
      </div>
    </CalendarFunctionContext.Provider>
  );
};
