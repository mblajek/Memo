import {htmlAttributes, NON_NULLABLE} from "components/utils";
import {filterAndSortInDayView} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {createMemo, For, JSX, Show, splitProps} from "solid-js";
import {CellWithPreferredStyling} from "../CellWithPreferredStyling";
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
  const blocks = createMemo(() => filterAndSortInDayView(props.day, props.blocks));
  const events = createMemo(() => filterAndSortInDayView(props.day, props.events));
  return (
    <CellWithPreferredStyling
      {...htmlAttributes.merge(divProps, {
        class: "w-full h-full overflow-x-clip overflow-y-auto min-h-6 max-h-16",
        onClick: props.onEmptyClick,
      })}
      preferences={[blocks(), events()].flatMap((objs) =>
        objs.map((o) => o.monthCellStylingPreference).filter(NON_NULLABLE),
      )}
    >
      <div class="flex flex-col items-stretch mb-2">
        <For each={blocks()}>
          {(block) => (
            <Show when={block.contentInAllDayArea}>
              {(content) => <div class="w-full overflow-clip shrink-0">{content()(props.columnViewInfo)}</div>}
            </Show>
          )}
        </For>
        <div
          class="p-px flex flex-col items-stretch gap-px"
          style={{
            // Match the margin of the hours area events.
            "margin-right": "11px",
          }}
        >
          <For each={events()}>
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
    </CellWithPreferredStyling>
  );
};
