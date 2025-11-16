import {DateTimeFormatOptions} from "luxon";
import {createMemo, Show, VoidComponent} from "solid-js";
import {formatDayMinuteHM, MAX_DAY_MINUTE} from "./day_minute_util";

interface Props {
  readonly dayMinute: number;
  readonly seconds?: boolean;
}

export const AlignedTime: VoidComponent<Props> = (props) => {
  const format = (): DateTimeFormatOptions | undefined => (props.seconds ? {second: "2-digit"} : undefined);
  const maxLen = createMemo(() => formatDayMinuteHM(MAX_DAY_MINUTE - 1, format()).length);
  const formatted = createMemo(() => formatDayMinuteHM(props.dayMinute, format()));
  return (
    <span>
      <Show when={props.dayMinute < 10 * 60}>
        <span class="invisible">{"0".repeat(maxLen() - formatted().length)}</span>
      </Show>
      {formatted()}
    </span>
  );
};
