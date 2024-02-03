import {A, AnchorProps} from "@solidjs/router";
import {createLocalStoragePersistence} from "components/persistence/persistence";
import {richJSONSerialiser} from "components/persistence/serialiser";
import {NON_NULLABLE, currentDate, htmlAttributes, useLangFunc} from "components/utils";
import {DayMinuteRange, MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {createOneTimeEffect} from "components/utils/one_time_effect";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {createCalendarRequestCreator, meetingsFromQuery} from "data-access/memo-api/tquery/calendar";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {useAttendantsCreator} from "features/meeting/MeetingAttendantsFields";
import {MeetingChangeSuccessData} from "features/meeting/meeting_change_success_data";
import {createMeetingCreateModal} from "features/meeting/meeting_create_modal";
import {createMeetingModal} from "features/meeting/meeting_modal";
import {meetingTimeInitialValue} from "features/meeting/meeting_time_controller";
import {DateTime} from "luxon";
import {IoArrowBackOutline, IoArrowForwardOutline} from "solid-icons/io";
import {OcTable3} from "solid-icons/oc";
import {TbInfoTriangle} from "solid-icons/tb";
import {
  Match,
  Show,
  Signal,
  Switch,
  VoidComponent,
  batch,
  createComputed,
  createMemo,
  createSignal,
  getOwner,
  mergeProps,
  on,
  onMount,
  runWithOwner,
  splitProps,
} from "solid-js";
import toast from "solid-toast";
import {activeFacilityId} from "state/activeFacilityId.state";
import {Button} from "../Button";
import {Capitalize} from "../Capitalize";
import {SegmentedControl} from "../form/SegmentedControl";
import {EN_DASH} from "../symbols";
import {CalendarColumn, ColumnsCalendar} from "./ColumnsCalendar";
import {ResourceGroup, ResourceItem, ResourcesSelector} from "./ResourcesSelector";
import {TinyCalendar} from "./TinyCalendar";
import {AllDayArea} from "./calendar-columns/AllDayArea";
import {DayHeader} from "./calendar-columns/DayHeader";
import {HoursArea} from "./calendar-columns/HoursArea";
import {ResourceHeader} from "./calendar-columns/ResourceHeader";
import {HoursAreaBlock} from "./calendar-columns/blocks";
import {MeetingEventBlock} from "./calendar-columns/events";
import {getRandomEventColors} from "./colors";
import {DaysRange} from "./days_range";
import {Block, PartDayTimeSpan} from "./types";
import {WeekDaysCalculator} from "./week_days_calculator";

export const MODES = ["month", "week", "day"] as const;
export type Mode = (typeof MODES)[number];

interface Props extends htmlAttributes.div {
  readonly locale: Intl.Locale;
  readonly holidays?: readonly DateTime[];
  readonly modes?: readonly Mode[];
  readonly initialMode?: Mode;
  readonly initialResourcesSelection?: readonly string[];
  readonly initialDay?: DateTime;
  /** The key to use for persisting the parameters of the displayed page. If not present, nothing is persisted. */
  readonly staticPersistenceKey?: string;
  readonly meetingListLinkProps?: AnchorProps;
}

const defaultProps = () =>
  ({
    modes: MODES,
    initialMode: "week",
    initialResourcesSelection: [],
    initialDay: currentDate(),
  }) satisfies Partial<Props>;

const PIXELS_PER_HOUR_RANGE = [40, 400] as const;

/**
 * The state of the calendar persisted in the local storage.
 *
 * Warning: Changing this type may break the persistence and the whole application in a browser.
 * Either make sure the change is backwards compatible (allows reading earlier data),
 * or bump the version of the persistence.
 */
type PersistentState = {
  readonly today: string;
  readonly mode: Mode;
  readonly daysSel: readonly (readonly [Mode, DaysRange])[];
  readonly resourcesSel: {
    readonly checkbox: ReadonlySet<string>;
    readonly radio: string | null;
  };
  readonly pixelsPerHour: number;
};
const PERSISTENCE_VERSION = 3;

/**
 * A full-page calendar, consisting of a tiny calendar, a list of resources (people), calendar mode
 * switcher, and a large calendar with either month view, or hours view.
 */
export const FullCalendar: VoidComponent<Props> = (propsArg) => {
  const mProps = mergeProps(defaultProps(), propsArg);
  const [props, divProps] = splitProps(mProps, [
    "locale",
    "holidays",
    "modes",
    "initialMode",
    "initialResourcesSelection",
    "initialDay",
    "staticPersistenceKey",
    "meetingListLinkProps",
  ]);
  const t = useLangFunc();
  const {attendantsInitialValueForCreate} = useAttendantsCreator();
  const meetingCreateModal = createMeetingCreateModal();
  const meetingModal = createMeetingModal();

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
            <div class="w-full flex justify-between gap-1 select-none">
              <span>{staff.name}</span>
              <span
                class="shrink-0 self-center border rounded"
                style={{
                  width: "14px",
                  height: "14px",
                  ...coloring.regular,
                }}
              />
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
  const weekDayCalculator = createMemo(() => new WeekDaysCalculator(props.locale));
  function getRange(day: DateTime, m = mode()) {
    switch (m) {
      case "month":
        return new DaysRange(day.startOf("month"), day.endOf("month"));
      case "week":
        return weekDayCalculator().dayToWorkdays(day);
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
  const daysSelectionByMode = new Map<Mode, Signal<DaysRange>>();
  for (const mode of MODES) {
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
      range = weekDayCalculator().dayToWeek(currentDate());
    } else {
      range = getRange(currentDate());
    }
    setDaysSelectionAndMonth(range);
  }

  const [pixelsPerHour, setPixelsPerHour] = createSignal(120);

  if (props.staticPersistenceKey) {
    createLocalStoragePersistence<PersistentState>({
      key: `FullCalendar:${props.staticPersistenceKey}`,
      value: () => ({
        today: currentDate().toISODate(),
        mode: mode(),
        daysSel: Array.from(daysSelectionByMode, ([mode, [sel]]) => [mode, sel()] as const),
        resourcesSel: {
          checkbox: selectedResourcesCheckbox(),
          radio: selectedResourceRadio() || null,
        },
        pixelsPerHour: pixelsPerHour(),
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
          setPixelsPerHour(state.pixelsPerHour);
        });
        // Once resources are loaded, make sure there aren't selected resources that don't really exist.
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
      serialiser: richJSONSerialiser<PersistentState>(),
      version: [PERSISTENCE_VERSION],
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
                setDaysSelection(weekDayCalculator().dayToWeek(prevDaysSelection.start));
              } else {
                // Select the first work week of this month.
                for (const day of prevDaysSelection) {
                  if (!weekDayCalculator().isWeekend(day)) {
                    setDaysSelection(weekDayCalculator().dayToWorkdays(day));
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

  const {dataQuery: meetingsDataQuery} = createTQuery({
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    entityURL: `facility/${activeFacilityId()}/meeting`,
    requestCreator: createCalendarRequestCreator({
      daysRange: daysSelection,
      staff: () => [...selectedResources()],
    }),
  });
  const meetingResources = meetingsFromQuery(meetingsDataQuery);
  const events = () =>
    meetingResources()?.map((meeting) => {
      const timeSpan: PartDayTimeSpan = {
        allDay: false,
        date: DateTime.fromISO(meeting.date),
        startDayMinute: meeting.startDayminute,
        durationMinutes: meeting.durationMinutes,
      };
      return {
        meeting,
        ...timeSpan,
      };
    }) || [];

  const [blinkingMeetings, setBlinkingMeetings] = createSignal<ReadonlyMap<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  function blinkMeeting(meetingId: string) {
    clearTimeout(blinkingMeetings().get(meetingId));
    setBlinkingMeetings((map) =>
      new Map(map).set(
        meetingId,
        setTimeout(() => {
          setBlinkingMeetings((map) => {
            const modified = new Map(map);
            modified.delete(meetingId);
            return modified;
          });
        }, 3000),
      ),
    );
  }

  const owner = getOwner();
  function meetingChange(operation: "create" | "edit", meeting: MeetingChangeSuccessData) {
    blinkMeeting(meeting.id);
    const message = t(
      operation === "create"
        ? "forms.meeting_create.success"
        : operation === "edit"
          ? "forms.meeting_edit.success"
          : (operation satisfies never),
    );
    const meetingDate = DateTime.fromISO(meeting.date);
    toast.success(
      runWithOwner(owner, () => (
        <div class="flex gap-2 items-baseline">
          <span>{message}</span>
          <Button
            class="secondary small"
            onClick={() => {
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
              scrollIntoView(meeting.startDayminute, meeting.durationMinutes);
              blinkMeeting(meeting.id);
            }}
          >
            {t("actions.show")}
          </Button>
        </div>
      )),
    );
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
      setTimeout(() => setScrollToDayMinute(scroll), 0);
    }
  }
  onMount(() => {
    scrollIntoView(7 * 60, 1e3);
  });

  const [hoveredMeetingId, setHoveredMeetingId] = createSignal<string>();

  function getCalendarColumnPart(day: DateTime, staffId: string | undefined) {
    const fakeWorkingHours: Block[] = weekDayCalculator().isWeekend(day)
      ? []
      : [
          {
            allDay: false,
            date: day,
            startDayMinute: 9 * 60,
            durationMinutes: 8 * 60,
            content: () => <HoursAreaBlock class="bg-white" />,
          },
        ];
    const selectedEvents = () =>
      staffId
        ? events()
            .filter((ev) => ev.meeting.staff.some((staff) => staff.userId === staffId))
            .map((ev) => ({
              ...ev,
              content: () => (
                <MeetingEventBlock
                  meeting={ev.meeting}
                  plannedColoring={staffResourcesById().get(staffId)!.coloring}
                  blink={!isCalendarLoading() && blinkingMeetings().has(ev.meeting.id)}
                  onHoverChange={(hovered) => setHoveredMeetingId(hovered ? ev.meeting.id : undefined)}
                  hovered={hoveredMeetingId() === ev.meeting.id}
                  onClick={() =>
                    meetingModal.show({
                      meetingId: ev.meeting.id,
                      initialViewMode: true,
                      onEdited: (meeting) => meetingChange("edit", meeting),
                      onCopyCreated: (meeting) => meetingChange("create", meeting),
                      onDeleted: () => toast.success(t("forms.meeting_delete.success")),
                      showToast: false,
                    })
                  }
                />
              ),
            }))
        : [];
    return {
      day,
      allDayArea: () => <AllDayArea day={day} blocks={[]} events={[]} />,
      hoursArea: () => (
        <HoursArea
          class="bg-[rgb(236,237,241)]"
          day={day}
          blocks={fakeWorkingHours}
          events={selectedEvents()}
          onTimeClick={(t) =>
            meetingCreateModal.show({
              initialValues: {
                ...meetingTimeInitialValue(t),
                ...attendantsInitialValueForCreate(staffId ? [staffId] : undefined),
              },
              onSuccess: (meeting) => meetingChange("create", meeting),
              showToast: false,
            })
          }
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
        // eslint-disable-next-line solid/reactivity
        return Array.from(daysSelection(), (day) => ({
          header: () => <DayHeader day={day} />,
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
                          class="hover:underline"
                          onClick={() => {
                            setMode("week");
                            setDaysSelectionAndMonthFromDay(day);
                          }}
                        >
                          {text}
                        </Button>
                      )}
                      title={text}
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

  const isCalendarLoading = () => !calendarColumns().length || meetingsDataQuery.isFetching;

  return (
    <>
      <div {...htmlAttributes.merge(divProps, {class: "flex items-stretch gap-1"})}>
        <div class="flex flex-col items-stretch gap-1" style={{"flex-basis": "min-content"}}>
          <TinyCalendar
            locale={props.locale}
            showWeekdayNames
            holidays={props.holidays}
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
          <ResourcesSelector
            class="overflow-y-auto"
            resourceGroups={resourceGroups()}
            mode={resourcesSelectionMode()}
            selection={selectedResources()}
            setSelection={setSelectedResources}
          />
          <Show when={props.meetingListLinkProps}>
            <div class="grow" />
            <div class="p-1 border-t border-r flex gap-0.5">
              <Show when={props.meetingListLinkProps}>
                {(linkProps) => (
                  <A {...linkProps()} class="py-0.5 flex gap-1 items-center text-sm">
                    <OcTable3 /> {t("calendar.show_meeting_list")}
                  </A>
                )}
              </Show>
            </div>
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
              <Capitalize text={t("calendar.today")} />
            </Button>
            <div class="grow self-center text-center text-lg text-ellipsis">
              <Capitalize text={getDaysSelectionText()} />
            </div>
            <SegmentedControl
              name="calendarMode"
              value={mode()}
              setValue={setMode}
              items={props.modes.map((m) => ({value: m, label: () => t(`calendar.units.${m}`)}))}
              small
            />
          </div>
          <Switch>
            <Match when={mode() === "month"}>
              <div>Календар буде тут.</div>
            </Match>
            <Match when={!selectedResources().size}>
              <div class="mx-2 my-6 flex justify-center gap-1">
                <TbInfoTriangle size={20} class="text-memo-active" />
                {t("calendar.select_resource_to_show_calendar")}
              </div>
            </Match>
            <Match when={true}>
              <ColumnsCalendar
                class="h-full min-h-0"
                isLoading={isCalendarLoading()}
                columns={calendarColumns()}
                pixelsPerHour={pixelsPerHour()}
                onVisibleRangeChange={setVisibleDayMinuteRange}
                scrollToDayMinute={scrollToDayMinute()}
                onWheelWithAlt={(e) =>
                  setPixelsPerHour((v) =>
                    Math.min(Math.max(v - 0.05 * e.deltaY, PIXELS_PER_HOUR_RANGE[0]), PIXELS_PER_HOUR_RANGE[1]),
                  )
                }
              />
            </Match>
          </Switch>
        </div>
      </div>
    </>
  );
};
