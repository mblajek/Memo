import {htmlAttributes} from "components/utils";
import {DateTime} from "luxon";
import {For, Show, VoidComponent, splitProps} from "solid-js";
import {Block, Event} from "../types";
import s from "./AllDayArea.module.scss";

interface Props extends htmlAttributes.div {
  readonly day: DateTime;
  readonly blocks: readonly Block[];
  readonly events: readonly Event[];
}

/** The all-day events area of a calendar column. */
export const AllDayArea: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["day", "blocks", "events"]);
  return (
    <div {...htmlAttributes.merge(divProps, {class: s.allDayArea})}>
      <For each={props.blocks}>
        {(block) => (
          <Show when={block.allDay && block.range.contains(props.day) && block.contentInAllDayArea}>
            {(content) => <div class={s.block}>{content()()}</div>}
          </Show>
        )}
      </For>
      <div class={s.eventsArea}>
        <For each={props.events}>
          {(event) => (
            <Show when={event.allDay && event.range.contains(props.day)}>
              <div class={s.event} onClick={(e) => e.stopPropagation()}>
                {event.content()}
              </div>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
};
