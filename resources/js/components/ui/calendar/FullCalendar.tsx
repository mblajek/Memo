import {DateTime} from "luxon";
import {IoArrowBackOutline, IoArrowForwardOutline} from "solid-icons/io";
import {VoidComponent, createComputed, createMemo, createSignal, mergeProps, on, splitProps} from "solid-js";
import {NON_NULLABLE, currentDate, htmlAttributes, useLangFunc} from "../../utils";
import {Button} from "../Button";
import {Capitalize} from "../Capitalize";
import {SegmentedControl} from "../form";
import {ResourceGroup, ResourcesSelector} from "./ResourcesSelector";
import {TinyCalendar} from "./TinyCalendar";
import {DaysRange} from "./days_range";
import {WeekDaysCalculator} from "./week_days_calculator";

export type Mode = "month" | "week" | "day";

interface Props extends htmlAttributes.div {
  locale: Intl.Locale;
  resourceGroups: readonly ResourceGroup[];
  holidays?: readonly DateTime[];
  modes?: Mode[];
  initialMode?: Mode;
  initialResourcesSelection?: readonly string[];
  initialDay?: DateTime;
}

const defaultProps = () =>
  ({
    modes: ["month", "week", "day"],
    initialMode: "week",
    initialResourcesSelection: [] as readonly string[],
    initialDay: currentDate(),
  }) as const;

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
  ]);

  const t = useLangFunc();
  const [mode, setMode] = createSignal(props.initialMode);
  const weekDayCalculator = createMemo(() => new WeekDaysCalculator(props.locale));
  function getRange(day: DateTime) {
    const m = mode();
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
  // Initialise to whatever range, it will be overwritten below.
  const [daysSelection, daysSelectionSetter] = createSignal(DaysRange.oneDay(props.initialDay));
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

  // TODO: Consider keeping three separate signals with rays selection for each mode.
  /** The last days selection in each of the modes. */
  const daysSelectionByMode = new Map<Mode, DaysRange>();
  /** Sets the selection and stores the value in daysSelectionByMode. */
  function setDaysSelection(range: DaysRange) {
    daysSelectionByMode.set(mode(), range);
    daysSelectionSetter(range);
  }
  // eslint-disable-next-line solid/reactivity
  setDaysSelection(getRange(props.initialDay));

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

  // Set the days selection when the mode is changed.
  createComputed(
    on(mode, (mode, prevMode) => {
      if (prevMode && mode !== prevMode) {
        // Restore the previous selection for this mode if it overlaps with the current selection.
        const savedDaysSelection = daysSelectionByMode.get(mode);
        if (savedDaysSelection?.intersects(daysSelection())) {
          setDaysSelectionAndMonth(savedDaysSelection);
        } else {
          // Calculate the new selection from the old selection (from different mode).
          if (mode === "month") {
            setDaysSelectionAndMonthFromDay(daysSelection().center());
          } else if (mode === "week") {
            if (prevMode === "month") {
              // Never change tinyCalMonth when switching from month to week.
              if (daysSelectionByMode.get("week")?.length() === 7) {
                // Select a calendar week.
                setDaysSelection(weekDayCalculator().dayToWeek(daysSelection().start));
              } else {
                // Select the first work week of this month.
                for (const day of daysSelection()) {
                  if (!weekDayCalculator().isWeekend(day)) {
                    setDaysSelection(weekDayCalculator().dayToWorkdays(day));
                    break;
                  }
                }
              }
            } else {
              setDaysSelectionAndMonthFromDay(daysSelection().start);
            }
          } else if (mode === "day") {
            setDaysSelectionAndMonthFromDay(daysSelection().start);
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
        return `${daysSelection().start.toLocaleString({
          day: "numeric",
          month: fitsInMonth ? undefined : "long",
        })} — ${daysSelection().end.toLocaleString({day: "numeric", month: "long", year: "numeric"})}`;
      }
      case "day":
        return daysSelection().start.toLocaleString({weekday: "long", day: "numeric", month: "long", year: "numeric"});
      default:
        return m satisfies never;
    }
  }

  return (
    <div {...htmlAttributes.merge(divProps, {class: "flex items-stretch gap-1"})}>
      <div class="flex flex-col items-stretch gap-1" style={{"flex-basis": "min-content"}}>
        <TinyCalendar
          locale={props.locale}
          showWeekdayNames={true}
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
            setMode(mode() === "day" ? "week" : "day");
            setDaysSelectionAndMonthFromDay(day);
          }}
          onMonthNameClick={() => {
            setMode("month");
            setDaysSelection(getRange(tinyCalMonth()));
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
      <div class="grow flex flex-col items-stretch gap-1">
        <div class="pt-1 pr-1 flex items-stretch gap-1">
          <div>
            <Button class="h-full secondarySmall !rounded-r-none" onClick={() => moveDaysSelection(-1)}>
              <IoArrowBackOutline class="text-current" />
            </Button>
            <Button
              class="h-full secondarySmall !rounded-l-none"
              style={{"margin-left": "-1px"}}
              onClick={() => moveDaysSelection(1)}
            >
              <IoArrowForwardOutline class="text-current" />
            </Button>
          </div>
          <Button class="secondarySmall" onClick={() => setDaysSelectionAndMonthFromDay(currentDate())}>
            <Capitalize text={t("calendar.today")} />
          </Button>
          <div class="grow self-center text-center text-lg text-ellipsis">
            <Capitalize text={getDaysSelectionText()} />
          </div>
          <SegmentedControl
            name="calendarMode"
            value={mode()}
            setValue={setMode}
            items={[
              {value: "month", label: () => t("calendar.month")},
              {value: "week", label: () => t("calendar.week")},
              {value: "day", label: () => t("calendar.day")},
            ]}
            small={true}
          />
        </div>
        <div>Календар буде тут.</div>
      </div>
    </div>
  );
};
