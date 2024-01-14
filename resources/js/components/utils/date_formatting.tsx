import {DateTime} from "luxon";
import {For, Show, Signal, VoidComponent, createSignal, onMount} from "solid-js";
import {LangFunc, useLangFunc} from "./lang";
import {currentDate} from "./time";

const weekdayNameByOrigName = new Map<string, string>();

/** Returns the desired weekday name, using the possible overrides from the translations. */
function weekdayName(t: LangFunc, weekday: string) {
  let result = weekdayNameByOrigName.get(weekday);
  if (!result) {
    result = t(`calendar.weekday_overrides.${weekday}`, {defaultValue: weekday});
    weekdayNameByOrigName.set(weekday, result);
  }
  return result;
}

/** Formats the datetime, applying the weekday overrides from the translations. */
export function formatDateTimeWithWeekday(t: LangFunc, dateTime: DateTime, format: Intl.DateTimeFormatOptions) {
  return dateTime
    .toLocaleParts(format)
    .map((part) => (part.type === "weekday" ? weekdayName(t, part.value) : part.value))
    .join("");
}

interface Props {
  readonly dateTime: DateTime;
  readonly format: Intl.DateTimeFormatOptions;
  /** Whether to display the weekday with constant width, which is useful for a column of dates. */
  readonly alignWeekday?: boolean;
}

/**
 * Formatted datetime with weekday overrides applied, optionally with const weekday part width,
 * so that the date looks good when displayed in column.
 *
 * This component is useful mostly when the short weekday format is used, which is most likely to be
 * overridden in the translations. For other formats, `date.toLocaleString()` is usually sufficient.
 */
export const FormattedDateTime: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <span>
      <For each={props.dateTime.toLocaleParts(props.format)}>
        {(part) => (
          <Show when={part.type === "weekday"} fallback={part.value}>
            <Show when={props.alignWeekday} fallback={weekdayName(t, part.value)}>
              <AlignedWeekday value={part.value} format={props.format} />
            </Show>
          </Show>
        )}
      </For>
    </span>
  );
};

/** A list of all weekday names, by the format key. */
const weekdayNamesByFormatKey = new Map<string, Signal<string[]>>();

function getFormatKey(format: Intl.DateTimeFormatOptions) {
  return format.weekday || (format.dateStyle ? `d:${format.dateStyle}` : undefined);
}

function getWeekdayNames(t: LangFunc, format: Intl.DateTimeFormatOptions) {
  const key = getFormatKey(format);
  if (!key) {
    return [];
  }
  let names = weekdayNamesByFormatKey.get(key);
  if (!names) {
    const namesArr = [];
    const dt = currentDate();
    for (let i = 0; i < 7; i++) {
      const weekdayPart = dt
        .plus({days: i})
        .toLocaleParts(format)
        .find((p) => p.type === "weekday");
      if (weekdayPart) {
        namesArr.push(weekdayName(t, weekdayPart.value));
      }
    }
    const [getNames, setNames] = createSignal(namesArr);
    names = [getNames, setNames];
    weekdayNamesByFormatKey.set(key, names);
  }
  return names;
}

/** The weekday value, aligned to the longest weekday with this formatting. */
const AlignedWeekday: VoidComponent<{value: string; format: Intl.DateTimeFormatOptions}> = (props) => {
  const t = useLangFunc();
  const weekdayNamesSignal = () => getWeekdayNames(t, props.format);
  const weekdayNames = () => weekdayNamesSignal()[0]();
  return (
    <span class="inline-grid text-right">
      <span
        class="contents invisible"
        ref={(span) => {
          if (weekdayNames().length > 1) {
            // To reduce the number of elements, keep just the longest name.
            onMount(() => {
              if (weekdayNames().length > 1) {
                const widestChild = Array.from(span.children, (child) => child.firstElementChild as HTMLElement).reduce(
                  (a, el) => (a.offsetWidth > el.offsetWidth ? a : el),
                );
                weekdayNamesSignal()[1]([widestChild.textContent!]);
              }
            });
          }
        }}
      >
        <For each={weekdayNames()}>
          {(n) => (
            <span style={{"grid-column": 1, "grid-row": 1}}>
              <span>{n}</span>
            </span>
          )}
        </For>
      </span>
      <span style={{"grid-column": 1, "grid-row": 1}}>{weekdayName(t, props.value)}</span>
    </span>
  );
};
