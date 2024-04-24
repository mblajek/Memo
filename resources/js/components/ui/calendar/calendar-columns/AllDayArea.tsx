import {htmlAttributes} from "components/utils";
import {isOnDay} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {For, JSX, Show, splitProps} from "solid-js";
import {Block, Event} from "../types";

interface Props<C> extends htmlAttributes.div {
  readonly day: DateTime;
  readonly columnViewInfo: C;
  readonly blocks: readonly Block<C, never>[];
  readonly events: readonly Event<C, never>[];
  readonly onEmptyClick?: () => void;
}

/** The all-day events area of a calendar column. */
export const AllDayArea = <C,>(allProps: Props<C>): JSX.Element => {
  const [props, divProps] = splitProps(allProps, ["day", "columnViewInfo", "blocks", "events", "onEmptyClick"]);
  const blocksOnDay = () => props.blocks.filter((block) => isOnDay(props.day, block));
  const eventsOnDay = () => props.events.filter((event) => isOnDay(props.day, event));
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "w-full overflow-x-clip overflow-y-auto flex flex-col items-stretch min-h-6 max-h-16",
        onClick: props.onEmptyClick,
      })}
    >
      <For each={blocksOnDay()}>
        {(block) => (
          <Show when={block.contentInAllDayArea}>
            {(content) => <div class="w-full overflow-clip shrink-0">{content()(props.columnViewInfo)}</div>}
          </Show>
        )}
      </For>
      <div
        class="p-px mb-2 flex flex-col items-stretch gap-px"
        style={{
          // Match the margin of the hours area events.
          "margin-right": "11px",
        }}
      >
        <For each={eventsOnDay()}>
          {(event) => (
            <Show when={event.contentInAllDayArea}>
              {(content) => (
                <div class="overflow-clip" onClick={(e) => e.stopPropagation()}>
                  {content()(props.columnViewInfo)}
                </div>
              )}
            </Show>
          )}
        </For>
      </div>
    </div>
  );
};
