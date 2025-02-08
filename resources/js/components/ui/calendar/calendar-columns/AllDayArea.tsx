import {Button} from "components/ui/Button";
import {actionIcons} from "components/ui/icons";
import {useCalendarFunctionContext} from "components/ui/meetings-calendar/calendar_modes";
import {NON_NULLABLE} from "components/utils/array_filter";
import {cx} from "components/utils/classnames";
import {filterAndSortInDayView} from "components/utils/day_minute_util";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
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
  const t = useLangFunc();
  const calendarFunction = useCalendarFunctionContext();
  const blocks = createMemo(() => filterAndSortInDayView(props.day, props.blocks));
  const events = createMemo(() => filterAndSortInDayView(props.day, props.events));
  const showAddButton = () => calendarFunction === "timeTables";
  return (
    <CellWithPreferredStyling
      {...htmlAttributes.merge(divProps, {
        class: "w-full h-full overflow-x-clip overflow-y-auto min-h-6 max-h-16",
        onClick: props.onEmptyClick,
      })}
      preferences={[blocks(), events()].flatMap((objs) =>
        objs.map((o) => o.allDayAreaStylingPreference).filter(NON_NULLABLE),
      )}
    >
      <div
        class={cx("min-h-full flex flex-col items-stretch justify-between p-px", showAddButton() ? undefined : "mb-2")}
      >
        <div class="flex flex-col">
          <For each={blocks()}>{(block) => block.contentInAllDayArea?.(props.columnViewInfo)}</For>
          <div
            class="flex flex-col items-stretch gap-px"
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
        <Show when={showAddButton()}>
          <Button
            class="bg-white hover:bg-hover text-grey-text border border-input-border rounded flex justify-center"
            title={t("actions.add")}
          >
            <actionIcons.Add />
          </Button>
        </Show>
      </div>
    </CellWithPreferredStyling>
  );
};
