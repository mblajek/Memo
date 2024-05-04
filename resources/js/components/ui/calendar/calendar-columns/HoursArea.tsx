import {htmlAttributes} from "components/utils";
import {DayMinuteRange, dayMinuteToHM, getDayMinuteRange} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {For, JSX, createMemo, splitProps} from "solid-js";
import {useColumnsCalendar} from "../ColumnsCalendar";
import {Block, ContentInHoursArea, Event, TimeSpan} from "../types";
import {calculateOverlaps} from "./overlaps_calculator";

interface Props<C> extends htmlAttributes.div {
  readonly day: DateTime;
  readonly columnViewInfo: C;
  readonly blocks: readonly Block<C, never>[];
  readonly events: readonly Event<C, never>[];
  readonly onTimeClick?: (time: DateTime, e: MouseEvent) => void;
}

const FULL_WIDTH = {left: "0", right: "0"} satisfies JSX.CSSProperties;

/** The part-day events area of a calendar column. */
export const HoursArea = <C,>(allProps: Props<C>): JSX.Element => {
  const [props, divProps] = splitProps(allProps, ["day", "columnViewInfo", "blocks", "events", "onTimeClick"]);
  const {calProps, dayMinuteToPixelY} = useColumnsCalendar();
  function mapToDayMinuteRange<T extends TimeSpan & Partial<ContentInHoursArea<C>>>(objs: readonly T[]) {
    const res = new Map<T, DayMinuteRange>();
    for (const obj of objs) {
      if (obj.contentInHoursArea) {
        const range = getDayMinuteRange(props.day, obj);
        if (range) {
          res.set(obj, range);
        }
      }
    }
    return res;
  }
  const blocksToDayMinuteRange = createMemo(() => mapToDayMinuteRange(props.blocks));
  const eventsToDayMinuteRange = createMemo(() => mapToDayMinuteRange(props.events));
  const overlapsMap = createMemo(() =>
    // eslint-disable-next-line solid/reactivity
    calculateOverlaps([...eventsToDayMinuteRange().keys()], (event) => eventsToDayMinuteRange().get(event)!),
  );

  function getStyleYSize([start, end]: DayMinuteRange): JSX.CSSProperties {
    const top = dayMinuteToPixelY(start);
    const bottomY = dayMinuteToPixelY(end);
    const height = bottomY - top;
    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  }

  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "w-full h-full overflow-clip relative",
        onClick: (e) => {
          if (!props.onTimeClick) {
            return;
          }
          const boundingRect = e.currentTarget.getBoundingClientRect();
          const offsetY = e.clientY - boundingRect.top;
          const pixelsPerCell = calProps.pixelsPerHour * (calProps.gridCellMinutes / 60);
          const cellIndex = Math.floor(offsetY / pixelsPerCell);
          props.onTimeClick(props.day.set(dayMinuteToHM(cellIndex * calProps.gridCellMinutes)).startOf("minute"), e);
        },
      })}
    >
      <For each={[...blocksToDayMinuteRange()]}>
        {([block, dayMinuteRange]) => (
          <div class="absolute overflow-clip" style={{...getStyleYSize(dayMinuteRange), ...FULL_WIDTH}}>
            {block.contentInHoursArea?.(props.columnViewInfo)}
          </div>
        )}
      </For>
      <div
        class="h-full ml-px relative z-10 pointer-events-none"
        // Leave enough room on the right for labeled blocks.
        style={{"margin-right": "11px"}}
      >
        <For each={[...eventsToDayMinuteRange()]}>
          {([event, dayMinuteRange]) => {
            const styleXSize = (): JSX.CSSProperties => {
              const overlap = overlapsMap().get(event);
              return overlap
                ? {
                    left: `${(100 * overlap.index) / overlap.count}%`,
                    right: `${100 * (1 - (overlap.index + 1) / overlap.count)}%`,
                  }
                : FULL_WIDTH;
            };
            return (
              <div
                class="absolute overflow-clip pt-px pointer-events-auto"
                style={{
                  ...styleXSize(),
                  ...getStyleYSize(dayMinuteRange),
                  // For some reason this value sometimes gives better rounding than 1px.
                  "padding-right": "1.05px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {event.contentInHoursArea?.(props.columnViewInfo)}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};
