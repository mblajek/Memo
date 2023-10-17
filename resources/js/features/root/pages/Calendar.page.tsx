import {DaysRange, SegmentedControl, TinyCalendar, WeekDaysCalculator} from "components/ui";
import {DateTime} from "luxon";
import {VoidComponent, createSignal} from "solid-js";

export default (() => {
  const locale = new Intl.Locale("pl");
  const weekDayCalculator = new WeekDaysCalculator(locale);
  const [selection, setSelection] = createSignal<DaysRange>();
  const [month, setMonth] = createSignal<DateTime>(DateTime.now());
  const [mode, setMode] = createSignal("week");
  return (
    <div class="flex gap-1 items-start">
      {/* A tiny calendar with some example behaviour of selecting work days (or whole week when clicking on weekend). */}
      <TinyCalendar
        class="inline-block"
        locale={locale}
        showWeekdayNames={true}
        holidays={[
          [8, 15],
          [11, 11],
          [11, 1],
          [12, 25],
          [12, 26],
        ].map(([month, day]) => DateTime.fromObject({month, day}))}
        selection={selection()}
        month={month()}
        getHoverRange={(day) => weekDayCalculator.dayToWorkdays(day)}
        setMonth={setMonth}
        onDayClick={(day, range) => {
          setMonth(day);
          setSelection(range);
        }}
      />
      <SegmentedControl
        name="calModeControl"
        items={[
          {value: "month", label: () => <>Miesiąc</>},
          {value: "week", label: () => <>Tydzień</>},
          {value: "day", label: () => <>Dzień</>},
        ]}
        value={mode()}
        setValue={setMode}
      />
      <SegmentedControl
        name="calModeControl"
        items={[
          {value: "month", label: () => <>Miesiąc</>},
          {value: "week", label: () => <>Tydzień</>},
          {value: "day", label: () => <span title="podpowiedź">Dzień</span>},
        ]}
        value={mode()}
        setValue={setMode}
        small={true}
      />
    </div>
  );
}) satisfies VoidComponent;
