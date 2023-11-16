import {htmlAttributes} from "components/utils";
import {DateTime} from "luxon";
import {For, JSX, Show, VoidComponent, createMemo, splitProps} from "solid-js";
import {useColumnsCalendar} from "../ColumnsCalendar";
import {Block, Event, PartDayEvent} from "../types";
import {DayMinuteRange, FULL_DAY_MINUTE_RANGE, dayMinuteToHM, getDayMinuteRange} from "../util";
import s from "./HoursArea.module.scss";
import {calculateOverlaps} from "./overlaps_calculator";

interface Props extends htmlAttributes.div {
  readonly day: DateTime;
  readonly blocks: readonly Block[];
  readonly events: readonly Event[];

  readonly onTimeClick?: (time: DateTime, e: MouseEvent) => void;
}

const FULL_WIDTH = {left: "0", right: "0"} satisfies JSX.CSSProperties;

/** The part-day events area of a calendar column. */
export const HoursArea: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["day", "blocks", "events"]);
  const {calProps, dayMinuteToPixelY} = useColumnsCalendar();

  interface EventData {
    readonly event: PartDayEvent;
    readonly dayMinuteRange: DayMinuteRange;
  }
  const eventsData = createMemo((): EventData[] =>
    props.events
      .filter((event): event is PartDayEvent => !event.allDay)
      .map((event) => ({event, dayMinuteRange: getDayMinuteRange(props.day, event.range)}))
      .filter((data): data is EventData => !!data.dayMinuteRange),
  );
  const overlapsMap = createMemo(() => calculateOverlaps(eventsData(), ({dayMinuteRange}) => dayMinuteRange!));

  function getStyleYSize([start, end]: DayMinuteRange): JSX.CSSProperties {
    const top = dayMinuteToPixelY(start);
    const bottomY = dayMinuteToPixelY(end);
    const height = bottomY - top;
    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  }

  const BlockComponent: VoidComponent<{block: Block}> = (blockProps) => {
    const getData = () => {
      if (blockProps.block.allDay) {
        if (blockProps.block.contentInHoursArea && blockProps.block.range.contains(props.day)) {
          return {dayMinuteRange: FULL_DAY_MINUTE_RANGE, content: blockProps.block.contentInHoursArea};
        }
      } else {
        const dayMinuteRange = getDayMinuteRange(props.day, blockProps.block.range);
        return dayMinuteRange && {dayMinuteRange, content: blockProps.block.content};
      }
    };
    return (
      <Show when={getData()}>
        {(data) => (
          <div
            class={s.block}
            style={{
              ...getStyleYSize(data().dayMinuteRange),
              ...FULL_WIDTH,
            }}
          >
            {data().content()}
          </div>
        )}
      </Show>
    );
  };

  const EventComponent: VoidComponent<{eventData: EventData}> = (eventProps) => {
    const styleXSize = (): JSX.CSSProperties => {
      const overlap = overlapsMap().get(eventProps.eventData);
      return overlap
        ? {
            left: `${(100 * overlap.index) / overlap.count}%`,
            right: `${100 * (1 - (overlap.index + 1) / overlap.count)}%`,
          }
        : FULL_WIDTH;
    };
    return (
      <div
        class={s.event}
        style={{
          ...styleXSize(),
          ...getStyleYSize(eventProps.eventData.dayMinuteRange),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {eventProps.eventData.event.content()}
      </div>
    );
  };

  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: s.hoursArea,
        onClick: (e) => {
          if (!divProps.onTimeClick) {
            return;
          }
          const boundingRect = e.currentTarget.getBoundingClientRect();
          const offsetY = e.clientY - boundingRect.top;
          const pixelsPerCell = calProps.pixelsPerHour * (calProps.gridCellMinutes / 60);
          const cellIndex = Math.floor(offsetY / pixelsPerCell);
          divProps.onTimeClick(props.day.set(dayMinuteToHM(cellIndex * calProps.gridCellMinutes)).startOf("minute"), e);
        },
      })}
    >
      <For each={props.blocks}>{(block) => <BlockComponent block={block} />}</For>
      <div class={s.eventsArea}>
        <For each={eventsData()}>{(eventData) => <EventComponent eventData={eventData} />}</For>
      </div>
    </div>
  );
};
