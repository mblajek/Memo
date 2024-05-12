import {currentDate, currentTimeMinute, cx, htmlAttributes} from "components/utils";
import {DayMinuteRange, MAX_DAY_MINUTE, formatDayMinuteHM, getDayMinute} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {
  Accessor,
  For,
  Index,
  JSX,
  Show,
  VoidComponent,
  createComputed,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  on,
  splitProps,
  useContext,
} from "solid-js";
import {LoadingPane} from "../LoadingPane";
import s from "./ColumnsCalendar.module.scss";

interface GlobalParameters {
  readonly pixelsPerHour?: number;
  readonly gridCellMinutes?: number;
}

interface Props extends GlobalParameters, htmlAttributes.div {
  readonly columns: readonly CalendarColumn[];
  readonly onVisibleRangeChange?: (range: DayMinuteRange) => void;
  readonly scrollToDayMinute?: number;
  readonly isLoading?: boolean;
  readonly onWheelWithAlt?: (e: WheelEvent, area: "allDay" | "hours") => void;
}

export interface CalendarColumn {
  readonly day: DateTime;
  readonly header: () => JSX.Element;
  readonly allDayArea: () => JSX.Element;
  readonly hoursArea: () => JSX.Element;
}

const DEFAULT_PARAMETERS: Required<GlobalParameters> = {
  pixelsPerHour: 120,
  gridCellMinutes: 30,
};

const Context = createContext<ContextValue>();

interface ContextValue {
  readonly calProps: Required<GlobalParameters>;
  readonly dayMinuteToPixelY: (dayMinute: number) => number;
  readonly hoursArea: Accessor<HTMLDivElement>;
}

export function useColumnsCalendar() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Not inside ColumnsCalendar");
  }
  return context;
}

const TIME_TRACK_LABEL_HEIGHT = 40;

export const ColumnsCalendar: VoidComponent<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PARAMETERS, allProps);
  const [props, divProps] = splitProps(defProps, [
    "pixelsPerHour",
    "gridCellMinutes",
    "columns",
    "onVisibleRangeChange",
    "scrollToDayMinute",
    "isLoading",
    "onWheelWithAlt",
  ]);
  const dayMinutes = createMemo(() => {
    const gridCellMinutes = props.gridCellMinutes;
    return Array.from({length: Math.floor(MAX_DAY_MINUTE / gridCellMinutes)}, (_, i) => i * gridCellMinutes);
  });
  const timeTrackLabelDayMinutes = createMemo(() => {
    const maxLabelsPerHour = Math.floor(props.pixelsPerHour / TIME_TRACK_LABEL_HEIGHT);
    const cellsPerHour = 60 / props.gridCellMinutes;
    let labelsPerHour = Math.max(1, Math.min(cellsPerHour, maxLabelsPerHour));
    while (cellsPerHour % labelsPerHour) {
      labelsPerHour--;
    }
    const cellsPerLabel = cellsPerHour / labelsPerHour;
    return dayMinutes().filter((m, i) => i % cellsPerLabel === 0);
  });
  function dayMinuteToPixelY(dayMinute: number) {
    return (dayMinute / 60) * props.pixelsPerHour;
  }
  function pixelYToDayMinute(pixelY: number) {
    return Math.min(Math.max(Math.round((pixelY / props.pixelsPerHour) * 60), 0), MAX_DAY_MINUTE);
  }
  function isToday(day: DateTime) {
    return day.hasSame(currentDate(), "day");
  }
  const nowPixelY = createMemo(() => Math.round(dayMinuteToPixelY(getDayMinute(currentTimeMinute()))));
  const [hoursArea, setHoursArea] = createSignal<HTMLDivElement>();
  const context: ContextValue = {
    calProps: props,
    dayMinuteToPixelY,
    hoursArea: () => hoursArea()!,
  };
  const [hoursAreaScrollOffset, setHoursAreaScrollOffset] = createSignal(0);
  createComputed(() => {
    if (hoursArea() && props.onVisibleRangeChange) {
      props.onVisibleRangeChange?.([
        pixelYToDayMinute(hoursAreaScrollOffset()),
        pixelYToDayMinute(hoursAreaScrollOffset() + hoursArea()!.clientHeight),
      ]);
    }
  });
  createEffect(
    on([hoursArea, () => props.scrollToDayMinute], ([hoursArea, scrollToDayMinute], _prevInput, prev) => {
      if (hoursArea && scrollToDayMinute !== undefined) {
        hoursArea.scrollTo({
          top: (scrollToDayMinute / 60) * props.pixelsPerHour,
          // First scroll is instant, then smooth.
          behavior: prev ? "smooth" : "instant",
        });
        return true;
      }
      return prev;
    }),
  );
  createEffect(
    on(
      () => props.pixelsPerHour,
      (pixelsPerHour, prevPixelsPerHour) => {
        const hArea = hoursArea();
        if (hArea && prevPixelsPerHour !== undefined) {
          const h = hArea.clientHeight;
          hArea.scrollTo({
            top: ((hArea.scrollTop + h / 2) * pixelsPerHour) / prevPixelsPerHour - h / 2,
            behavior: "instant",
          });
        }
      },
    ),
  );
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: s.columnsCalendar,
        style: {
          "--num-columns": props.columns.length,
          "--pixels-per-hour": props.pixelsPerHour,
        },
      })}
    >
      <Context.Provider value={context}>
        <div class={s.columnsHeader}>
          <For each={props.columns}>{(col) => <div class={s.cell}>{col.header()}</div>}</For>
        </div>
        <div
          ref={(div) => {
            div.addEventListener(
              "wheel",
              (e) => {
                if (e.altKey) {
                  props.onWheelWithAlt?.(e, "allDay");
                  e.preventDefault();
                }
              },
              {passive: false},
            );
          }}
          class={s.columnsAllDayArea}
        >
          <For each={props.columns}>{(col) => <div class={s.cell}>{col.allDayArea()}</div>}</For>
        </div>
        <div
          ref={(div) => {
            setHoursArea(div);
            div.addEventListener(
              "wheel",
              (e) => {
                if (e.altKey) {
                  props.onWheelWithAlt?.(e, "hours");
                  e.preventDefault();
                }
              },
              {passive: false},
            );
          }}
          class={s.hoursArea}
          onScroll={() => setHoursAreaScrollOffset(hoursArea()!.scrollTop)}
        >
          <div class={s.timeTrack}>
            <Index each={timeTrackLabelDayMinutes()}>
              {(dayMinute) => (
                <div
                  class={cx(s.label, dayMinute() % 60 ? undefined : s.fullHour)}
                  style={{top: `${dayMinuteToPixelY(dayMinute())}px`}}
                >
                  {formatDayMinuteHM(dayMinute())}
                </div>
              )}
            </Index>
            <Show when={props.columns.some(({day}) => isToday(day))}>
              <div class={s.nowLine} style={{top: `${nowPixelY()}px`}} />
            </Show>
          </div>
          <div class={s.columnsHoursArea}>
            <For each={props.columns}>
              {(col) => (
                <div class={s.cell}>
                  {col.hoursArea()}
                  <Show when={isToday(col.day)}>
                    <div class={s.nowLine} style={{top: `${nowPixelY()}px`}} />
                  </Show>
                </div>
              )}
            </For>
          </div>
          <div class={s.gridRowLines}>
            <Index each={[...dayMinutes(), MAX_DAY_MINUTE]}>
              {(dayMinute) => (
                <div
                  class={cx(s.gridRowLine, dayMinute() % 60 ? undefined : s.fullHour)}
                  style={{top: `${dayMinuteToPixelY(dayMinute())}px`}}
                />
              )}
            </Index>
          </div>
        </div>
      </Context.Provider>
      <LoadingPane isLoading={props.isLoading} />
    </div>
  );
};
