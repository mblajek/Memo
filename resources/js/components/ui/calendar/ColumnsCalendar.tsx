import {cx} from "components/utils/classnames";
import {DayMinuteRange, MAX_DAY_MINUTE, formatDayMinuteHM, getDayMinute} from "components/utils/day_minute_util";
import {GetRef} from "components/utils/GetRef";
import {htmlAttributes} from "components/utils/html_attributes";
import {currentDate, currentTimeMinute} from "components/utils/time";
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
        class: "grid gap-y-1.5 gap-x-px relative text-sm",
        style: {
          "grid-template-rows": `\
            [header-start] auto [header-end
            all-day-area-start] auto [all-day-area-end
            hours-area-start] 1fr [hours-area-end]`,
          "grid-template-columns": `\
            [time-track-start] 2.5rem [time-track-end
            columns-start] repeat(max(1, ${props.columns.length}), minmax(0, 1fr)) [columns-end
            scroll-start] var(--sb-size) [scroll-end]`,
          "line-height": "1.1",
        },
      })}
    >
      <Context.Provider value={context}>
        <div class="grid grid-cols-subgrid" style={{"grid-area": "header / columns"}}>
          <For each={props.columns}>{(col) => <div>{col.header()}</div>}</For>
        </div>
        <div
          class="grid grid-cols-subgrid"
          style={{"grid-area": "all-day-area / columns"}}
          on:wheel={{
            handleEvent: (e) => {
              if (e.altKey) {
                props.onWheelWithAlt?.(e, "allDay");
                e.preventDefault();
              }
            },
            passive: false,
          }}
        >
          <For each={props.columns}>
            {(col) => <div class="outline outline-1 outline-gray-300">{col.allDayArea()}</div>}
          </For>
        </div>
        <GetRef ref={setHoursArea} waitForMount>
          <div
            class="grid grid-cols-subgrid overflow-y-scroll border-t border-gray-300 relative"
            style={{
              "grid-area": "hours-area",
              "grid-column": "1 / -1",
              "grid-template-rows": `${24 * props.pixelsPerHour + 1}px`,
            }}
            on:wheel={{
              handleEvent: (e) => {
                if (e.altKey) {
                  props.onWheelWithAlt?.(e, "hours");
                  e.preventDefault();
                }
              },
              passive: false,
            }}
            onScroll={() => setHoursAreaScrollOffset(hoursArea()!.scrollTop)}
          >
            <div class="relative" style={{"grid-column": "time-track"}}>
              <Index each={timeTrackLabelDayMinutes()}>
                {(dayMinute) => (
                  <div
                    class={cx(
                      "absolute w-full px-1 text-right text-xs text-grey-text",
                      dayMinute() % 60 ? "text-opacity-60" : undefined,
                    )}
                    style={{top: `${dayMinuteToPixelY(dayMinute())}px`}}
                  >
                    {formatDayMinuteHM(dayMinute())}
                  </div>
                )}
              </Index>
              <Show when={props.columns.some(({day}) => isToday(day))}>
                <div class="absolute w-full h-0 border-b-2 border-red-500 z-50" style={{top: `${nowPixelY()}px`}} />
              </Show>
            </div>
            <div class="grid grid-cols-subgrid" style={{"grid-column": "columns"}}>
              <For each={props.columns}>
                {(col) => (
                  <div class="outline outline-1 outline-gray-300 relative">
                    {col.hoursArea()}
                    <Show when={isToday(col.day)}>
                      <div
                        class="absolute w-full h-0 border-b-2 border-red-500 z-50"
                        style={{top: `${nowPixelY()}px`}}
                      />
                    </Show>
                  </div>
                )}
              </For>
            </div>
            <div class="contents z-10 pointer-events-none">
              <Index each={[...dayMinutes(), MAX_DAY_MINUTE]}>
                {(dayMinute) => (
                  <div
                    class={cx(
                      "absolute w-full h-0 border-b border-gray-600",
                      dayMinute() % 60 ? "border-dotted border-opacity-20" : "border-solid border-opacity-30",
                    )}
                    style={{top: `${dayMinuteToPixelY(dayMinute())}px`}}
                  />
                )}
              </Index>
            </div>
          </div>
        </GetRef>
      </Context.Provider>
      <LoadingPane isLoading={props.isLoading} />
    </div>
  );
};
