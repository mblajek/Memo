import {currentDate, currentTime, cx, htmlAttributes} from "components/utils";
import {MAX_DAY_MINUTE, formatDayMinuteHM, getDayMinute} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {
  For,
  Index,
  JSX,
  Show,
  VoidComponent,
  createContext,
  createEffect,
  createMemo,
  mergeProps,
  on,
  splitProps,
  useContext,
} from "solid-js";
import {BigSpinner} from "../Spinner";
import s from "./ColumnsCalendar.module.scss";

interface GlobalParameters {
  readonly pixelsPerHour?: number;
  readonly gridCellMinutes?: number;
}

interface Props extends GlobalParameters, htmlAttributes.div {
  readonly columns: readonly CalendarColumn[];
  readonly scrollToDayMinute?: number;
  readonly isLoading?: boolean;

  readonly onWheelWithAlt?: (e: WheelEvent) => void;
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
}

export function useColumnsCalendar() {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Not inside ColumnsCalendar");
  }
  return context;
}

export const ColumnsCalendar: VoidComponent<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PARAMETERS, allProps);
  const [props, divProps] = splitProps(defProps, [
    "pixelsPerHour",
    "gridCellMinutes",
    "columns",
    "scrollToDayMinute",
    "isLoading",
    "onWheelWithAlt",
  ]);
  const dayMinutes = createMemo(() => {
    const gridCellMinutes = props.gridCellMinutes;
    return Array.from({length: Math.floor(MAX_DAY_MINUTE / gridCellMinutes)}, (_, i) => i * gridCellMinutes);
  });
  function dayMinuteToPixelY(dayMinute: number) {
    return (dayMinute / 60) * props.pixelsPerHour;
  }
  function isToday(day: DateTime) {
    return day.hasSame(currentDate(), "day");
  }
  const nowPixelY = createMemo(() => Math.round(dayMinuteToPixelY(getDayMinute(currentTime()))));
  const context: ContextValue = {
    calProps: props,
    dayMinuteToPixelY,
  };
  let hoursArea: HTMLDivElement | undefined;
  createEffect(
    on(
      () => props.scrollToDayMinute,
      (scrollToDayMinute, _prevInput, prev) => {
        if (scrollToDayMinute !== undefined) {
          hoursArea?.scrollTo({
            top: (scrollToDayMinute / 60) * props.pixelsPerHour,
            // First scroll is instant, then smooth.
            behavior: prev ? "smooth" : "instant",
          });
        }
        return true;
      },
    ),
  );
  createEffect(
    on(
      () => props.pixelsPerHour,
      (pixelsPerHour, prevPixelsPerHour) => {
        if (hoursArea && prevPixelsPerHour !== undefined) {
          const h = hoursArea.clientHeight;
          hoursArea.scrollTo({
            top: ((hoursArea.scrollTop + h / 2) * pixelsPerHour) / prevPixelsPerHour - h / 2,
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
        <div class={s.columnsAllDayArea}>
          <For each={props.columns}>{(col) => <div class={s.cell}>{col.allDayArea()}</div>}</For>
        </div>
        <div
          ref={hoursArea}
          class={s.hoursArea}
          onWheel={(e) => {
            if (e.altKey) {
              props.onWheelWithAlt?.(e);
              e.preventDefault();
            }
          }}
        >
          <div class={s.timeTrack}>
            <Index each={dayMinutes()}>
              {(dayMinute) => (
                <div class={s.label} style={{top: `${dayMinuteToPixelY(dayMinute())}px`}}>
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
                  class={cx(s.gridRowLine, {[s.fullHour!]: dayMinute() % 60 === 0})}
                  style={{top: `${dayMinuteToPixelY(dayMinute())}px`}}
                />
              )}
            </Index>
          </div>
        </div>
      </Context.Provider>
      <Show when={props.isLoading}>
        <div class={s.loadingPane}>
          <BigSpinner />
        </div>
      </Show>
    </div>
  );
};
