import {NON_NULLABLE} from "components/utils/array_filter";
import {formatDayMinuteHM, MAX_DAY_MINUTE} from "components/utils/day_minute_util";
import {LangFunc, useLangFunc} from "components/utils/lang";
import {AlignedTime} from "components/utils/time_formatting";
import {Match, Switch, VoidComponent} from "solid-js";
import {TimeSpan} from "../calendar/types";
import {EN_DASH} from "../symbols";
import {MIDNIGHT_CROSSING_SYMBOL} from "./colors";

interface Props {
  readonly timeSpan: TimeSpan;
  readonly fromPrevDay?: boolean;
  readonly toNextDay?: boolean;
}

export const TimeSpanSummary: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <span>
      {props.fromPrevDay ? MIDNIGHT_CROSSING_SYMBOL : undefined}
      <Switch>
        <Match when={props.timeSpan.allDay}>{t("calendar.all_day")}</Match>
        <Match when={!props.timeSpan.allDay && props.timeSpan}>
          {(timeSpan) => (
            <>
              <span class="font-weight-medium">
                <AlignedTime dayMinute={timeSpan().startDayMinute} />
              </span>
              {EN_DASH}
              <span class="font-weight-medium">
                <AlignedTime dayMinute={(timeSpan().startDayMinute + timeSpan().durationMinutes) % MAX_DAY_MINUTE} />
              </span>
            </>
          )}
        </Match>
      </Switch>
      {props.toNextDay ? MIDNIGHT_CROSSING_SYMBOL : undefined}
    </span>
  );
};

/** Returns a text representation of the time span. Use TimeSpanSummary instead wherever possible. */
export function timeSpanSummary(t: LangFunc, timeSpan: TimeSpan, {fromPrevDay = false, toNextDay = false} = {}) {
  if (timeSpan.allDay) {
    return t("calendar.all_day");
  } else {
    return [
      fromPrevDay ? MIDNIGHT_CROSSING_SYMBOL : undefined,
      formatDayMinuteHM(timeSpan.startDayMinute),
      EN_DASH,
      formatDayMinuteHM((timeSpan.startDayMinute + timeSpan.durationMinutes) % MAX_DAY_MINUTE),
      toNextDay ? MIDNIGHT_CROSSING_SYMBOL : undefined,
    ]
      .filter(NON_NULLABLE)
      .join("");
  }
}
