import {Show, VoidComponent} from "solid-js";
import {formatDayMinuteHM} from "./day_minute_util";

interface Props {
  readonly dayMinute: number;
  readonly seconds?: boolean;
}

export const AlignedTime: VoidComponent<Props> = (props) => {
  const formatted = () => formatDayMinuteHM(props.dayMinute, props.seconds ? {second: "2-digit"} : undefined);
  return (
    <span>
      <Show when={props.dayMinute < 10 * 60}>
        <span class="invisible">0</span>
      </Show>
      {formatted()}
    </span>
  );
};
