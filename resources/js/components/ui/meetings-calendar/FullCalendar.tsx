import {A, useLocation, useSearchParams} from "@solidjs/router";
import {useQuery} from "@tanstack/solid-query";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage, sessionStorageStorage, userStorageStorage} from "components/persistence/storage";
import {PopOver} from "components/ui/PopOver";
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
import {getWeekFromDay, getWorkWeekFromDay} from "components/ui/calendar/week_days_calculator";
import {actionIcons} from "components/ui/icons";
import {style} from "components/ui/inline_styles";
import {NON_NULLABLE} from "components/utils/array_filter";
import {cx} from "components/utils/classnames";
import {DayMinuteRange, MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {featureUseTrackers} from "components/utils/feature_use_trackers";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {createOneTimeEffect} from "components/utils/one_time_effect";
import {currentDate} from "components/utils/time";
import {toastSuccess} from "components/utils/toast";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {User} from "data-access/memo-api/groups/User";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {useUserHrefs} from "features/facility-users/UserLink";
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
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
  splitProps,
} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {Button} from "../Button";
import {Capitalize} from "../Capitalize";
import {CheckboxInput} from "../CheckboxInput";
import {DocsModalInfoIcon, DocsModalInfoIconProps} from "../docs_modal";
import {SegmentedControl} from "../form/SegmentedControl";
import {staffIcons} from "../icons";
import {EN_DASH} from "../symbols";
import {title} from "../title";
import {StaffInfo, WithOrigMeetingInfo, useCalendarBlocksAndEvents} from "./calendar_blocks_and_events";
import {CalendarLocationState, CalendarSearchParams} from "./calendar_link";
import {CALENDAR_MODES, CalendarFunction, CalendarFunctionContext, CalendarMode} from "./calendar_modes";
import {
  CALENDAR_BACKGROUNDS,
  NON_STAFF_PLANNED_MEETING_COLORING,
  coloringToStyle,
  getRandomEventColors,
} from "./colors";

type _Directives = typeof title;

interface Props extends htmlAttributes.div {
  readonly staticCalendarFunction: CalendarFunction;
  readonly staticModes?: readonly CalendarMode[];
  /** The key to use for persisting the resources and days of the displayed page. If not present, selection is not persisted. */
  readonly staticSelectionPersistenceKey?: string;
  /** The key to use for persisting the presentation (view) settings. If not present, presentation settings are not persisted. */
  readonly staticPresentationPersistenceKey?: string;
  readonly pageInfo?: DocsModalInfoIconProps;
}

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

type PersistentSessionState = {
  readonly showInactiveStaff: boolean;
};

/**
 * A full-page calendar, consisting of a tiny calendar, a list of resources (people and meeting resources),
 * calendar mode switcher, and a large calendar with either month view, or hours view.
 */
export const FullCalendar: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, [
    "staticCalendarFunction",
    "staticModes",
    "staticSelectionPersistenceKey",
    "staticPresentationPersistenceKey",
    "pageInfo",
  ]);
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const {attendantsInitialValueForCreate} = useAttendantsCreator();
  const meetingCreateModal = createMeetingCreateModal();
  const meetingModal = createMeetingModal();
  const workTimeCreateModal = createWorkTimeCreateModal();
  const workTimeModal = createWorkTimeModal();
  const location = useLocation<CalendarLocationState>();
  const userHrefs = useUserHrefs();
  const featureWheelWithAlt = featureUseTrackers.calendarWheelWithAlt();
  const featureTinyCalDoubleClick = featureUseTrackers.calendarTinyCalendarDoubleClick();
  const [searchParams, setSearchParams] = useSearchParams<CalendarSearchParams>();

  const PIXELS_PER_HOUR_RANGE = {
    work: PIXELS_PER_HOUR_RANGE_WORK,
    timeTables: PIXELS_PER_HOUR_RANGE_TIME_TABLES,
    leaveTimes: {min: 0, max: 0, def: 0}, // No hours area in this mode.
  }[props.staticCalendarFunction];

  const userStatus = useQuery(User.statusQueryOptions);
  const [showInactiveStaff, setShowInactiveStaff] = createSignal(false);
  const [altStaffSort, setAltStaffSort] = createSignal(false);
  createPersistence<PersistentSessionState>({
    value: () => ({showInactiveStaff: showInactiveStaff()}),
    onLoad: (value) => {
      setShowInactiveStaff(value.showInactiveStaff);
    },
    storage: sessionStorageStorage("settings:FullCalendar"),
  });
  createPersistence({
    value: () => ({altStaffSort: altStaffSort()}),
    onLoad: (value) => {
      setAltStaffSort(value.altStaffSort);
    },
    storage: userStorageStorage("settings:FullCalendar"),
    version: [1],
  });
  const {dataQuery: staffDataQuery} = createTQuery({
    prefixQueryKey: FacilityStaff.keys.staff(),
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/user/staff`,
    requestCreator: staticRequestCreator({
      columns: [
        {type: "column", column: "id"},
        {type: "column", column: "name"},
        {type: "column", column: "staff.isActive"},
      ],
      sort: [{type: "column", column: "name", desc: false}],
      paging: {size: 1000},
    }),
  });
  interface StaffObj {
    readonly "id": string;
    readonly "name": string;
    readonly "staff.isActive": boolean;
  }
  const staff = () => staffDataQuery.data?.data as readonly StaffObj[] | undefined;
  const staffById = createMemo((): ReadonlyMap<string, StaffObj> => {
    const map = new Map<string, StaffObj>();
    for (const staffMember of staff() || []) {
      map.set(staffMember.id, staffMember);
    }
    return map;
  });
  const staffResources = createMemo(() => {
    let staffList = staff();
    function altSortKey({name}: StaffObj) {
      const parts = name.split(/\s+/g);
      return `${parts.at(-1)} ${name}`;
    }
    if (altStaffSort()) {
      staffList = staffList?.toSorted((a, b) => altSortKey(a).localeCompare(altSortKey(b)));
    }
    return (
      staffList
        ?.map((staff) => {
          const coloring = getRandomEventColors(staff.id);
          if (!showInactiveStaff() && !staff["staff.isActive"]) {
            return undefined;
          }
          return {
            id: staff.id,
            text: staff.name,
            coloring,
            label: () => (
              <div class="w-full py-1 flex justify-between gap-1 select-none">
                <span
                  class={cx("line-clamp-2", staff["staff.isActive"] ? undefined : "text-grey-text")}
                  {...style({"font-size": "0.92rem", "line-height": "1.15"})}
                >
                  {staff.name}
                </span>
                <Show when={props.staticCalendarFunction === "work"}>
                  <span
                    class="shrink-0 self-center border rounded"
                    {...style({
                      width: "14px",
                      height: "14px",
                      ...coloringToStyle(coloring, {part: "colorMarker"}),
                    })}
                  />
                </Show>
              </div>
            ),
          } satisfies ResourceItem & Record<string, unknown>;
        })
        .filter(NON_NULLABLE) || []
    );
  });
  const staffResourcesById = createMemo(() => {
    const byId = new Map<string, ReturnType<typeof staffResources>[number]>();
    for (const resource of staffResources()) {
      byId.set(resource.id, resource);
    }
    return byId;
  });
  const meetingResourceResources = createMemo(() =>
    props.staticCalendarFunction === "work"
      ? dictionaries()
          ?.get("meetingResource")
          .activePositions.map(
            (pos) =>
              ({
                id: pos.id,
                text: pos.label,
                label: () => (
                  <div class="w-full py-1 select-none">
                    <span
                      class="line-clamp-2 text-teal-700 font-semibold"
                      {...style({"font-size": "0.92rem", "line-height": "1.15"})}
                    >
                      {pos.label}
                    </span>
                  </div>
                ),
              }) satisfies ResourceItem & Record<string, unknown>,
          ) || []
      : [],
  );
  const allResources = () => [...staffResources(), ...meetingResourceResources()];
  const staffResourcesLabel = createMemo(() => (
    <div class="w-full flex items-stretch justify-between gap-1">
      <span class="font-bold select-none">
        <Capitalize text={t("models.staff._name_plural")} />
      </span>
      <PopOver
        trigger={(popOver) => (
          <Button class="my-0.5 !px-1 minimal" onClick={popOver.open}>
            <actionIcons.ThreeDots size="12" />
          </Button>
        )}
        placement={{placement: "right-start"}}
      >
        <div class="px-2 py-1 flex flex-col gap-1">
          <Show when={userStatus.data?.permissions.facilityAdmin && staff()?.some((staff) => !staff["staff.isActive"])}>
            <CheckboxInput
              checked={showInactiveStaff()}
              onChecked={(checked) =>
                batch(() => {
                  setShowInactiveStaff(checked);
                  if (!checked) {
                    const selected = new Set(selectedResources());
                    for (const staff of staffById().values()) {
                      if (!staff["staff.isActive"]) {
                        selected.delete(staff.id);
                      }
                    }
                    setSelectedResources(selected);
                  }
                })
              }
              label={<span class="font-normal">{t("facility_user.staff.list_show_inactive")}</span>}
            />
          </Show>
          <CheckboxInput
            checked={altStaffSort()}
            onChecked={setAltStaffSort}
            label={<span class="font-normal">{t("facility_user.staff.list_alt_sort")}</span>}
          />
        </div>
      </PopOver>
    </div>
  ));
  const resourceGroups = createMemo((): ResourceGroup[] => {
    const res: ResourceGroup[] = [];
    res.push({label: staffResourcesLabel, resources: staffResources()});
    const meetingResources = meetingResourceResources();
    if (meetingResources.length) {
      res.push({
        label: () => (
          <span class="font-bold select-none">
            <Capitalize text={t("models.meeting.resources")} />
          </span>
        ),
        resources: meetingResources,
      });
    }
    return res;
  });

  const modes = CALENDAR_MODES.filter((m) => props.staticModes?.includes(m) ?? true);
  if (!modes.length) {
    throw new Error("Empty modes list");
  }
  const initialMode = (["week", "day", "month"] as const).find((m) => modes.includes(m))!;
  const [mode, modeSetter] = createSignal<CalendarMode>(initialMode);
  function setMode(mode: CalendarMode) {
    if (modes.includes(mode)) {
      modeSetter(mode);
    }
  }
  function getRange(day: DateTime, m = mode()) {
    switch (m) {
      case "month":
        return new DaysRange(day.startOf("month"), day.endOf("month"));
      case "week":
        return getWorkWeekFromDay(day);
      case "day":
        return DaysRange.oneDay(day);
      default:
        return m satisfies never;
    }
  }
  const [tinyCalMonth, setTinyCalMonth] = createSignal(currentDate());
  // Initialise to whatever range, it will be immediately updated by the calendar.
  const [tinyCalVisibleRange, setTinyCalVisibleRange] = createSignal(DaysRange.oneDay(currentDate()));
  const [visibleDayMinuteRange, setVisibleDayMinuteRange] = createSignal<DayMinuteRange>([0, 0]);

  /** The resources selection view, allowing multiple selection only in the day mode. */
  const resourcesSelectionMode = () => (mode() === "day" ? "checkbox" : "radio");

  const [selectedResourcesCheckbox, setSelectedResourcesCheckbox] = createSignal<ReadonlySet<string>>(new Set());
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
    const [daysRange, setDaysRange] = createSignal(getRange(currentDate(), mode));
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
      range = getWeekFromDay(currentDate());
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
    if (props.staticCalendarFunction === "leaveTimes") {
      return;
    }
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
    featureWheelWithAlt.justUsed({area});
  }

  if (props.staticSelectionPersistenceKey) {
    createPersistence<PersistentSelectionState>({
      storage: localStorageStorage(`FullCalendar:${props.staticSelectionPersistenceKey}`),
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
          setMode(state.mode);
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
          effect: (staff) => {
            const validResourceIds = new Set<string>();
            for (const group of resourceGroups()) {
              for (const {id} of group.resources) {
                validResourceIds.add(id);
              }
            }
            if (!showInactiveStaff()) {
              for (const staffMember of staff) {
                if (!staffMember["staff.isActive"]) {
                  validResourceIds.delete(staffMember.id);
                }
              }
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
      version: [PERSISTENCE_SELECTION_VERSION],
    });
  }
  if (props.staticPresentationPersistenceKey) {
    createPersistence<PersistentPresentationState>({
      storage: localStorageStorage(`FullCalendar:${props.staticPresentationPersistenceKey}`),
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
                setDaysSelection(getWeekFromDay(prevDaysSelection.start));
              } else {
                // Select the first work week of this month.
                for (const day of prevDaysSelection) {
                  if (!day.isWeekend) {
                    setDaysSelection(getWorkWeekFromDay(day));
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

  const staffMapAndMeetingResources = createMemo(() => {
    const staffMap = new Map<string, StaffInfo>();
    const meetingResources: string[] = [];
    if (staff()) {
      // If staff is not loaded yet, we cannot distinguish between staff and meeting resources.
      // This might happen if selected resources are loaded from the persistence.
      for (const resourceId of selectedResources()) {
        const isStaff = staffById().has(resourceId);
        if (isStaff) {
          const staff = staffResourcesById().get(resourceId);
          staffMap.set(resourceId, {
            id: resourceId,
            plannedMeetingColoring: staff?.coloring || NON_STAFF_PLANNED_MEETING_COLORING,
          });
        } else {
          meetingResources.push(resourceId);
        }
      }
    }
    return {staffMap, meetingResources};
  });
  const {meetingsDataQuery, blocks, events} = useCalendarBlocksAndEvents({
    calendarFunction: props.staticCalendarFunction,
    mode,
    daysRange: daysSelection,
    staffMap: () => staffMapAndMeetingResources().staffMap,
    meetingResources: () => staffMapAndMeetingResources().meetingResources,
    blink: (meetingId) => (isCalendarLoading() ? false : blinkingMeetings().get(meetingId)),
    hoveredMeeting: [hoveredMeeting, setHoveredMeeting],
    allDayEventsHeight,
    monthEventsHeight,
    viewMeeting,
    viewWorkTime: (params) => workTimeModal.show(params),
  });

  function meetingChangeEffects(message: JSX.Element, meeting: MeetingBasicData, otherMeetingIds?: readonly string[]) {
    blinkMeeting(meeting.id);
    for (const id of otherMeetingIds || []) {
      blinkMeeting(id);
    }
    toastSuccess(() => (
      <div class="flex gap-2 items-baseline">
        <span>{message}</span>
        <Button class="secondary small" onClick={() => goToMeeting(meeting, otherMeetingIds)}>
          {t("actions.show")}
        </Button>
      </div>
    ));
  }

  function goToMeeting(meeting: MeetingBasicData, otherMeetingIds?: readonly string[]) {
    const meetingDate = DateTime.fromISO(meeting.date);
    if (!daysSelection().contains(meetingDate)) {
      setDaysSelectionAndMonthFromDay(meetingDate);
    }
    if (meeting.staff.length || meeting.resources.length) {
      if (mode() === "day") {
        // Select all the staff columns, or all the meeting resources if no staff.
        const selectedResources = new Set(selectedResourcesCheckbox());
        if (meeting.staff.length) {
          for (const {userId} of meeting.staff) {
            selectedResources.add(userId);
          }
        } else {
          for (const {resourceDictId} of meeting.resources) {
            selectedResources.add(resourceDictId);
          }
        }
        setSelectedResourcesCheckbox(selectedResources);
      } else if (
        !meeting.staff.some(({userId}) => userId === selectedResourceRadio()) &&
        !meeting.resources.some(({resourceDictId}) => resourceDictId === selectedResourceRadio())
      ) {
        // If not visible, show the first staff or the first meeting resource column.
        setSelectedResourceRadio(
          meeting.staff.length ? meeting.staff[0]!.userId : meeting.resources[0]!.resourceDictId,
        );
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
    for (const id of otherMeetingIds || []) {
      blinkMeeting(id);
    }
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

  function showResources(resourceIds: string[]) {
    const allResourcesSet = new Set(allResources().map((r) => r.id));
    resourceIds = resourceIds.filter((id) => allResourcesSet.has(id));
    if (!resourceIds.length) {
      return;
    }
    if (mode() === "day") {
      setSelectedResourcesCheckbox((selected) => {
        const set = new Set(selected);
        for (const resourceId of resourceIds) {
          set.add(resourceId);
        }
        return set;
      });
    } else if (!selectedResourceRadio() || !resourceIds.includes(selectedResourceRadio()!)) {
      setSelectedResourceRadio(resourceIds[0]);
    }
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
  const searchParamsObj = createMemo(() => ({...searchParams}));
  createEffect(
    on(searchParamsObj, (searchParams) => {
      if (searchParams.mode || searchParams.date || searchParams.resources) {
        if (searchParams.mode) {
          const modes = searchParams.mode.split(",");
          if (!modes.includes(mode())) {
            const firstMode = modes[0]!;
            if ((CALENDAR_MODES as readonly string[]).includes(firstMode)) {
              setMode(firstMode as CalendarMode);
            }
          }
        }
        // Wait for mode change to propagate before setting the other params.
        onMount(() => {
          if (searchParams.date) {
            setDaysSelectionAndMonthFromDay(DateTime.fromISO(searchParams.date));
          }
          if (searchParams.resources) {
            showResources(searchParams.resources.split(","));
          }
          setSearchParams({mode: undefined, date: undefined, resources: undefined}, {replace: true});
          history.replaceState({...history.state, mode: undefined, date: undefined, resources: undefined}, "");
        });
      }
      if (searchParams.meetingId) {
        const meetingToShowFromLocationState = () => location.state?.meetingToShow;
        const meetingToShowQuery = useQuery(() => ({
          enabled: !!searchParams.meetingId && !meetingToShowFromLocationState(),
          ...FacilityMeeting.meetingQueryOptions(searchParams.meetingId || ""),
        }));
        createOneTimeEffect({
          input: () => meetingToShowFromLocationState() || meetingToShowQuery.data,
          effect: (meeting) => {
            setSearchParams({meetingId: undefined}, {replace: true});
            history.replaceState({...history.state, meetingToShow: undefined}, "");
            // Give the calendar time to scroll to the initial position first.
            setTimeout(() => goToMeeting(meeting), 100);
          },
        });
      }
    }),
  );

  const blocksByStaffFilter = (staffId: string) => (block: WithOrigMeetingInfo) =>
    block.meeting.isFacilityWide || block.meeting.staff.some((s) => s.userId === staffId);
  const blocksByMeetingResourceFilter = (meetingResourceId: string) => (block: WithOrigMeetingInfo) =>
    block.meeting.isFacilityWide || block.meeting.resources.some((r) => r.resourceDictId === meetingResourceId);
  const blocksFilter = (resourceId: string, isStaff: boolean) =>
    isStaff ? blocksByStaffFilter(resourceId) : blocksByMeetingResourceFilter(resourceId);
  const eventsByStaffFilter = (staffId: string) => (event: WithOrigMeetingInfo) =>
    event.meeting.isFacilityWide || event.meeting.staff.some((s) => s.userId === staffId);
  const eventsByMeetingResourceFilter = (meetingResourceId: string) => (event: WithOrigMeetingInfo) =>
    // No facility-wide events shown for meeting resources.
    event.meeting.resources.some((r) => r.resourceDictId === meetingResourceId);
  const eventsFilter = (resourceId: string, isStaff: boolean) =>
    isStaff ? eventsByStaffFilter(resourceId) : eventsByMeetingResourceFilter(resourceId);

  function onMeetingsCreated(firstMeeting: MeetingBasicData, otherMeetingIds?: readonly string[]) {
    meetingChangeEffects(
      t(otherMeetingIds?.length ? "forms.meeting_series_create.success" : "forms.meeting_create.success"),
      firstMeeting,
      otherMeetingIds,
    );
  }

  function getCalendarColumnPart(day: DateTime, resourceId: string, marked?: boolean) {
    const isStaff = staffById().has(resourceId);
    const relevantBlocks = createMemo(() => blocks().filter(blocksFilter(resourceId, isStaff)));
    const relevantEvents = createMemo(() => events().filter(eventsFilter(resourceId, isStaff)));
    return {
      day,
      allDayArea: () => (
        <AllDayArea
          style={{background: CALENDAR_BACKGROUNDS.mainBg}}
          day={day}
          columnViewInfo={{day, resourceId}}
          blocks={relevantBlocks()}
          events={relevantEvents()}
          onEmptyClick={() => {
            if (props.staticCalendarFunction === "work") {
              meetingCreateModal.show({
                initialValues: {
                  ...meetingTimeFullDayInitialValue(day),
                  ...(isStaff ? attendantsInitialValueForCreate([resourceId]) : {resources: [resourceId]}),
                },
                onSuccess: onMeetingsCreated,
                showToast: false,
              });
            } else if (props.staticCalendarFunction === "timeTables") {
              workTimeCreateModal.show({
                initialValues: meetingTimeFullDayInitialValue(day),
                availableStaff: resourceId,
              });
            } else if (props.staticCalendarFunction === "leaveTimes") {
              throw new Error("Internal error");
            } else {
              return props.staticCalendarFunction satisfies never;
            }
          }}
          marked={marked}
        />
      ),
      hoursArea: () => (
        <HoursArea
          style={{background: CALENDAR_BACKGROUNDS.mainBg}}
          day={day}
          columnViewInfo={{day, resourceId}}
          blocks={relevantBlocks()}
          events={relevantEvents()}
          onTimeClick={(time) => {
            if (props.staticCalendarFunction === "work") {
              meetingCreateModal.show({
                initialValues: {
                  ...meetingTimePartDayInitialValue(time),
                  ...(isStaff ? attendantsInitialValueForCreate([resourceId]) : {resources: [resourceId]}),
                },
                onSuccess: onMeetingsCreated,
                showToast: false,
              });
            } else if (props.staticCalendarFunction === "timeTables") {
              workTimeCreateModal.show({
                initialValues: meetingTimePartDayInitialValue(time),
                availableStaff: resourceId,
              });
            } else if (props.staticCalendarFunction === "leaveTimes") {
              throw new Error("Internal error");
            } else {
              return props.staticCalendarFunction satisfies never;
            }
          }}
          marked={marked}
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
        const resource = selectedResourceRadio();
        if (!resource) {
          return [];
        }
        // eslint-disable-next-line solid/reactivity
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
          ...getCalendarColumnPart(day, resource),
        }));
      }
      case "day": {
        const day = daysSelection().start;
        return allResources()
          .map(({id, text}) => {
            if (!selectedResources().has(id)) {
              return undefined;
            }
            const isStaff = staffById().has(id);
            return {
              header: () => (
                <ResourceHeader
                  label={() => (
                    <Button
                      class={cx(
                        "rounded hover:underline",
                        id === hoveredResource() ? "bg-hover" : undefined,
                        isStaff ? undefined : "text-teal-700 font-semibold",
                      )}
                      onClick={() => {
                        setMode("week");
                        setDaysSelectionAndMonthFromDay(day);
                        setSelectedResourceRadio(id);
                      }}
                      title={`${text}\n${t(`calendar.click_for_resource_calendar.${isStaff ? "staff" : "meeting_resource"}`)}`}
                    >
                      <span class="line-clamp-3">{text}</span>
                    </Button>
                  )}
                  marked={id === userStatus.data?.user.id}
                />
              ),
              ...getCalendarColumnPart(day, id, id === userStatus.data?.user.id),
            };
          })
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
    const daysRange = getMonthCalendarRange(daysSelection().start);
    let resourceId: string | undefined;
    let blFilter: (bl: WithOrigMeetingInfo) => boolean;
    let evFilter: (ev: WithOrigMeetingInfo) => boolean;
    if (props.staticCalendarFunction === "leaveTimes") {
      resourceId = undefined;
      blFilter = () => true;
      evFilter = () => false;
    } else {
      const resId = allResources().find(({id}) => selectedResources().has(id))?.id;
      if (!resId) {
        return [];
      }
      const isStaff = staffById().has(resId);
      blFilter = blocksFilter(resId, isStaff);
      evFilter = eventsFilter(resId, isStaff);
      resourceId = resId;
    }
    return Array.from(daysRange, (day) => ({
      day,
      content: () => (
        <MonthCalendarCell
          month={daysSelection().start}
          day={day}
          monthViewInfo={{day, resourceId}}
          blocks={blocks().filter(blFilter)}
          events={events().filter(evFilter)}
          style={{background: CALENDAR_BACKGROUNDS.mainBg}}
          onDateClick={
            modes.includes("week")
              ? () => {
                  setMode("week");
                  setDaysSelectionAndMonthFromDay(day);
                }
              : undefined
          }
          onEmptyClick={() => {
            if (props.staticCalendarFunction === "work") {
              if (!resourceId) {
                throw new Error("Internal error");
              }
              meetingCreateModal.show({
                initialValues: {
                  date: day.toISODate(),
                  ...(staffById().has(resourceId)
                    ? attendantsInitialValueForCreate([resourceId])
                    : {resources: [resourceId]}),
                },
                onSuccess: onMeetingsCreated,
                showToast: false,
              });
            } else if (props.staticCalendarFunction === "timeTables") {
              workTimeCreateModal.show({
                initialValues: meetingTimeFullDayInitialValue(day),
                availableStaff: resourceId,
              });
            } else if (props.staticCalendarFunction === "leaveTimes") {
              // No action.
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
        <div class="flex flex-col items-stretch gap-1" {...style({"flex-basis": "min-content"})}>
          <Show when={props.staticCalendarFunction !== "leaveTimes"}>
            <TinyCalendar
              class="ms-1"
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
                featureTinyCalDoubleClick.justUsed();
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
                  class={cx("grow !px-0 overflow-clip", selectedResources().size ? "minimal" : "primary small")}
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
                  <div class={selectedResources().size ? "border-x-2 border-memo-active" : undefined}>
                    {t("calendar.show_my_calendar")}
                  </div>
                </Button>
                <div use:title={t("calendar.show_my_details")}>
                  <A
                    href={userHrefs.staffHref(userStatus.data!.user.id)}
                    role="button"
                    class="w-full h-full minimal flex items-center"
                  >
                    <staffIcons.Staff class="text-gray-700" />
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
          </Show>
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
              <Capitalize text={t(mode() === "month" ? "calendar.this_month" : "calendar.today")} />
            </Button>
            <div class="grow self-center text-center text-lg text-ellipsis">
              <Capitalize text={getDaysSelectionText()} />
            </div>
            <Show when={modes.length > 1}>
              <SegmentedControl
                name="calendarMode"
                value={mode()}
                onValueChange={(mode) => setMode(mode as CalendarMode)}
                items={modes.map((m) => ({value: m, label: () => t(`calendar.units.${m}`)}))}
                small
              />
            </Show>
            <Show when={props.pageInfo}>
              {(pageInfo) => (
                <div class="flex items-center">
                  <DocsModalInfoIcon title={t("calendar.more_info")} {...pageInfo()} />
                </div>
              )}
            </Show>
          </div>
          <Switch>
            <Match when={props.staticCalendarFunction !== "leaveTimes" && !selectedResources().size}>
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
            <Match when="week or day">
              <ColumnsCalendar
                class="h-full min-h-0"
                isLoading={isCalendarLoading()}
                columns={calendarColumns()}
                pixelsPerHour={pixelsPerHour()}
                gridCellMinutes={
                  {
                    work: 15,
                    timeTables: 60,
                    leaveTimes: 0, // Not supported in this mode.
                  }[props.staticCalendarFunction]
                }
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
