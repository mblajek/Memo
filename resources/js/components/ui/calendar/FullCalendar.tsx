import {NON_NULLABLE, currentDate, htmlAttributes, useLangFunc} from "components/utils";
import {DateTime, Interval} from "luxon";
import {IoArrowBackOutline, IoArrowForwardOutline} from "solid-icons/io";
import {TbInfoTriangle} from "solid-icons/tb";
import {
  Match,
  Signal,
  Switch,
  VoidComponent,
  batch,
  createComputed,
  createMemo,
  createSignal,
  mergeProps,
  on,
  splitProps,
} from "solid-js";
import {Button} from "../Button";
import {Capitalize} from "../Capitalize";
import {SegmentedControl} from "../form/SegmentedControl";
import {EM_DASH} from "../symbols";
import {CalendarColumn, ColumnsCalendar} from "./ColumnsCalendar";
import {Resource, ResourceGroup, ResourcesSelector} from "./ResourcesSelector";
import {TinyCalendar} from "./TinyCalendar";
import {AllDayArea} from "./calendar-columns/AllDayArea";
import {DayHeader} from "./calendar-columns/DayHeader";
import {HoursArea} from "./calendar-columns/HoursArea";
import {ResourceHeader} from "./calendar-columns/ResourceHeader";
import {AllDayAreaBlock, HoursAreaBlock} from "./calendar-columns/blocks";
import {AllDayEvent, PartDayEvent, Tag} from "./calendar-columns/events";
import {DaysRange} from "./days_range";
import {Block, Event} from "./types";
import {WeekDaysCalculator} from "./week_days_calculator";
import {createLocalStoragePersistence} from "components/persistence/persistence";

export const MODES = ["month", "week", "day"] as const;
export type Mode = (typeof MODES)[number];

interface Props extends htmlAttributes.div {
  readonly locale: Intl.Locale;
  readonly resourceGroups: readonly ResourceGroup[];
  readonly holidays?: readonly DateTime[];
  readonly modes?: readonly Mode[];
  readonly initialMode?: Mode;
  readonly initialResourcesSelection?: readonly string[];
  readonly initialDay?: DateTime;
  /** The key to use for persisting the parameters of the displayed page. If not present, nothing is persisted. */
  readonly staticPersistenceKey?: string;
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
 * A full-page calendar, consisting of a tiny calendar, a list of resources (people), calendar mode
 * switcher, and a large calendar with either month view, or hours view.
 */
export const FullCalendar: VoidComponent<Props> = (propsArg) => {
  const mProps = mergeProps(defaultProps(), propsArg);
  const [props, divProps] = splitProps(mProps, [
    "locale",
    "resourceGroups",
    "holidays",
    "modes",
    "initialMode",
    "initialResourcesSelection",
    "initialDay",
    "staticPersistenceKey",
  ]);

  const t = useLangFunc();
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
    for (const resourceGroup of props.resourceGroups) {
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

  const resources = createMemo(() => {
    const result = new Map<string, Resource>();
    for (const group of props.resourceGroups) {
      for (const resource of group.resources) {
        result.set(resource.id, resource);
      }
    }
    return result;
  });

  if (props.staticPersistenceKey) {
    createLocalStoragePersistence({
      key: `FullCalendar:${props.staticPersistenceKey}`,
      value: () => ({
        mode: mode(),
        daysSel: Array.from(daysSelectionByMode, ([mode, [sel]]) => [mode, sel()] as const),
        resourcesSel: {
          checkbox: selectedResourcesCheckbox(),
          radio: selectedResourceRadio(),
        },
      }),
      onLoad: (state) =>
        batch(() => {
          if (props.modes?.includes(state.mode)) {
            setMode(state.mode);
          }
          for (const [mode, daysSelection] of state.daysSel) {
            daysSelectionByMode.get(mode)?.[1](daysSelection);
          }
          setSelectedResourcesCheckbox(state.resourcesSel.checkbox);
          setSelectedResourceRadio(state.resourcesSel.radio);
          setTinyCalMonth(daysSelection().center());
        }),
      version: [1],
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
        })} ${EM_DASH} ${daysSelection().end.toLocaleString({day: "numeric", month: "long", year: "numeric"})}`;
      }
      case "day":
        return daysSelection().start.toLocaleString({weekday: "long", day: "numeric", month: "long", year: "numeric"});
      default:
        return m satisfies never;
    }
  }

  function getFakeColumnData(resource: Resource, day: DateTime) {
    // Produce some fake data for the specified day.
    const blocks: Block[] = [];
    const events: Event[] = [];
    if (day.weekday === 3) {
      blocks.push(
        {
          allDay: true,
          range: new DaysRange(day.minus({days: 1}), day.plus({days: 1})),
          contentInAllDayArea: () => <AllDayAreaBlock class="bg-gray-200" label="Trzydniowe aktualne" />,
        },
        {
          allDay: true,
          range: new DaysRange(day.minus({days: 3}), day.minus({days: 1})),
          contentInAllDayArea: () => <AllDayAreaBlock class="bg-gray-200" label="Trzydniowe nieaktualne" />,
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").minus({hours: 2}), {hours: 4}),
          content: () => <HoursAreaBlock class="bg-indigo-200" label="Noc jest" />,
        },
      );
      events.push(
        {
          allDay: true,
          range: new DaysRange(day.minus({days: 1}), day.plus({days: 1})),
          content: () => <AllDayEvent baseColor="blue">Trzydniowe aktualne</AllDayEvent>,
        },
        {
          allDay: true,
          range: new DaysRange(day.minus({days: 3}), day.minus({days: 1})),
          content: () => <AllDayEvent baseColor="red">Trzydniowe nieaktualne</AllDayEvent>,
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").minus({hours: 2}), {hours: 3}),
          content: () => (
            <PartDayEvent range={Interval.after(day.startOf("day").minus({hours: 1}), {hours: 2})} baseColor="green" />
          ),
        },
        {
          // Not on this day.
          allDay: false,
          range: Interval.after(day.startOf("day").minus({hours: 2}), {hours: 1}),
          content: () => (
            <PartDayEvent range={Interval.after(day.startOf("day").minus({hours: 2}), {hours: 1})} baseColor="green" />
          ),
        },
      );
    } else if (day.weekday <= 5) {
      blocks.push(
        {
          allDay: true,
          range: DaysRange.oneDay(day),
          contentInAllDayArea: () => <AllDayAreaBlock class="bg-gray-200" label="Dzień jakiś" />,
          contentInHoursArea: () => <HoursAreaBlock class="bg-gray-200" />,
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").set({hour: 8}), {hours: 8}),
          content: () => <HoursAreaBlock class="bg-white" label="Do roboty!" />,
        },
      );
      events.push(
        {
          allDay: true,
          range: DaysRange.oneDay(day),
          content: () => <AllDayEvent baseColor="blue">Tego...</AllDayEvent>,
        },
        {
          allDay: true,
          range: DaysRange.oneDay(day),
          content: () => (
            <AllDayEvent baseColor="red">asd serg s rtgh asrg adr tga srg adth adth adt dargadrg</AllDayEvent>
          ),
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").set({hour: 7}), {hours: 1}),
          content: () => (
            <PartDayEvent range={Interval.after(day.startOf("day").set({hour: 7}), {hours: 1})} baseColor="green">
              Spotkanie: <span class="font-bold">{resource.label()}</span>
            </PartDayEvent>
          ),
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").set({hour: 8, minute: 15}), {hours: 1}),
          content: () => (
            <PartDayEvent
              range={Interval.after(day.startOf("day").set({hour: 8, minute: 15}), {hours: 1})}
              baseColor="purple"
            >
              <div>Anna Kowalska</div>
              <div class="flex flex-wrap gap-px">
                <Tag color="red">odbyta</Tag>
                <Tag color="black">tag</Tag>
                <Tag color="orange">jakiś tag</Tag>
              </div>
              <div>Konsultacja</div>
            </PartDayEvent>
          ),
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").set({hour: 10}), {hours: 1}),
          content: () => (
            <PartDayEvent range={Interval.after(day.startOf("day").set({hour: 10}), {hours: 1})} baseColor="purple">
              <div>Anna Kowalska</div>
              <div class="flex flex-wrap gap-px">
                <Tag color="red">odbyta</Tag>
                <Tag color="black">tag</Tag>
                <Tag color="orange">jakiś tag</Tag>
              </div>
              <div>Konsultacja</div>
            </PartDayEvent>
          ),
        },
        {
          allDay: false,
          range: Interval.fromDateTimes(
            day.startOf("day").set({hour: 10, minute: 30}),
            day.startOf("day").set({hour: 12}),
          ),
          content: () => (
            <PartDayEvent
              range={Interval.fromDateTimes(
                day.startOf("day").set({hour: 10, minute: 30}),
                day.startOf("day").set({hour: 12}),
              )}
              baseColor="purple"
            >
              asd serg s rtgh asrg adr tga srg adth adth adt dargadrg
            </PartDayEvent>
          ),
        },
      );
    } else {
      blocks.push({
        allDay: false,
        range: Interval.after(day.startOf("day"), {hours: 11, minutes: 30}),
        content: () => <HoursAreaBlock class="bg-fuchsia-100" label="Spanko" />,
      });
      events.push(
        {
          allDay: true,
          range: DaysRange.oneDay(day),
          content: () => <AllDayEvent baseColor="pink">Leniuchowanie</AllDayEvent>,
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").set({hour: 12}), {minutes: 30}),
          content: () => (
            <PartDayEvent range={Interval.after(day.startOf("day").set({hour: 12}), {minutes: 30})} baseColor="green">
              Śniadanko
            </PartDayEvent>
          ),
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").set({hour: 12, minute: 30}), {hours: 1, minutes: 30}),
          content: () => (
            <PartDayEvent
              range={Interval.after(day.startOf("day").set({hour: 12, minute: 30}), {hours: 1, minutes: 30})}
              baseColor="green"
            >
              Memiki
            </PartDayEvent>
          ),
        },
        {
          allDay: false,
          range: Interval.after(day.startOf("day").set({hour: 14}), {hours: 1}),
          content: () => (
            <PartDayEvent range={Interval.after(day.startOf("day").set({hour: 14}), {hours: 1})} baseColor="green">
              Pizza
            </PartDayEvent>
          ),
        },
      );
    }
    return {
      day,
      allDayArea: () => (
        <AllDayArea
          day={day}
          blocks={blocks}
          events={events}
          onClick={() => console.log(`New all-day event on ${day.toISO()}`)}
        />
      ),
      hoursArea: () => (
        <HoursArea
          day={day}
          blocks={blocks}
          events={events}
          onTimeClick={(t) => console.log(`New part-day event at ${t.toISO()}`)}
        />
      ),
    } satisfies Partial<CalendarColumn>;
  }

  const calendarColumns = (): CalendarColumn[] => {
    const m = mode();
    switch (m) {
      case "month":
        // The columns calendar is not displayed in this mode anyway.
        return [];
      case "week":
        // eslint-disable-next-line solid/reactivity
        return Array.from(daysSelection(), (day) => ({
          ...getFakeColumnData(resources().get(selectedResourceRadio()!)!, day),
          header: () => <DayHeader day={day} />,
        }));
      case "day": {
        const day = daysSelection().start;
        // eslint-disable-next-line solid/reactivity
        return Array.from(resources(), ([resourceId, resource]) =>
          selectedResources().has(resourceId)
            ? {
                ...getFakeColumnData(resource, day),
                header: () => (
                  <ResourceHeader
                    // TODO: Consider a better way to get the resource label.
                    label={() => resource.label()}
                  />
                ),
              }
            : undefined,
        ).filter(NON_NULLABLE);
      }
      default:
        return m satisfies never;
    }
  };

  return (
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
          resourceGroups={props.resourceGroups}
          mode={resourcesSelectionMode()}
          selection={selectedResources()}
          setSelection={setSelectedResources}
        />
      </div>
      <div class="min-w-0 grow flex flex-col items-stretch gap-3">
        <div class="pt-1 pr-1 flex items-stretch gap-1">
          <div>
            <Button class="h-full secondarySmall !rounded-r-none" onClick={[moveDaysSelection, -1]}>
              <IoArrowBackOutline class="text-current" />
            </Button>
            <Button
              class="h-full secondarySmall !rounded-l-none"
              style={{"margin-left": "-1px"}}
              onClick={[moveDaysSelection, 1]}
            >
              <IoArrowForwardOutline class="text-current" />
            </Button>
          </div>
          <Button class="secondarySmall" onClick={goToToday}>
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
            <div class="my-4 mx-1 self-start flex gap-1">
              <TbInfoTriangle size={20} class="text-memo-active" />
              {t("calendar.select_resource_to_show_calendar")}
            </div>
          </Match>
          <Match when={true}>
            <ColumnsCalendar
              class="h-full min-h-0"
              columns={calendarColumns()}
              pixelsPerHour={pixelsPerHour()}
              scrollToDayMinute={6 * 60 + 50}
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
  );
};
