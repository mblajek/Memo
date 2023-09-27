import {DaysRange, TinyCalendar, dayToWorkdays} from "components/ui";
import {DateTime} from "luxon";
import {VoidComponent, createSignal} from "solid-js";

export default (() => {
  const [selection, setSelection] = createSignal<DaysRange>();
  const [month, setMonth] = createSignal<DateTime>(DateTime.now());
  return (
    // A tiny calendar with some example behaviour of selecting work days (or whole week when clicking on weekend).
    <TinyCalendar
      class="inline-block"
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
      getHoverRange={(day) => dayToWorkdays(day)}
      setMonth={setMonth}
      onDayClick={(day) => {
        setSelection(dayToWorkdays(day));
        setMonth(day);
      }}
    />
  );
}) satisfies VoidComponent;
