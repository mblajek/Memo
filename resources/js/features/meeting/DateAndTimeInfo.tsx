import {TimeDuration} from "components/ui/TimeDuration";
import {EN_DASH} from "components/ui/symbols";
import {cx} from "components/utils/classnames";
import {MAX_DAY_MINUTE, formatDayMinuteHM} from "components/utils/day_minute_util";
import {useLangFunc} from "components/utils/lang";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {DateTime} from "luxon";
import {Match, Show, Switch, VoidComponent} from "solid-js";

interface Props {
  readonly date: DateTime;
  /** Treat as all day time, regardless of the day minutes. */
  readonly allDay?: boolean;
  readonly startDayMinute?: number;
  readonly durationMinutes?: number;
  readonly twoLines?: boolean;
}

export const DateAndTimeInfo: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <div class={cx("flex", props.twoLines ? "flex-col" : "gap-2")}>
      <div>
        {props.date.toLocaleString({
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </div>
      <div class="flex gap-1">
        <Switch>
          <Match when={props.allDay || (props.startDayMinute === 0 && props.durationMinutes === MAX_DAY_MINUTE)}>
            <span>{t("parenthesised", {text: t("calendar.all_day")})}</span>
          </Match>
          <Match when={props.startDayMinute}>
            {(startDayMinute) => (
              <>
                <span class="font-semibold">{formatDayMinuteHM(startDayMinute())}</span>
                <Show when={props.durationMinutes}>
                  {(durationMinutes) => (
                    <>
                      <span>{EN_DASH}</span>
                      <span class="font-semibold">
                        {formatDayMinuteHM((startDayMinute() + durationMinutes()) % MAX_DAY_MINUTE)}
                      </span>
                      <span>
                        {t("parenthesis.open")}
                        <TimeDuration minutes={durationMinutes()} />
                        {t("parenthesis.close")}
                      </span>
                    </>
                  )}
                </Show>
              </>
            )}
          </Match>
        </Switch>
      </div>
    </div>
  );
};

interface MeetingDateAndTimeInfoProps {
  readonly meeting: Pick<MeetingResource, "date" | "startDayminute" | "durationMinutes">;
  readonly twoLines?: boolean;
}

export const MeetingDateAndTimeInfo: VoidComponent<MeetingDateAndTimeInfoProps> = (props) => (
  <DateAndTimeInfo
    date={DateTime.fromISO(props.meeting.date)}
    startDayMinute={props.meeting.startDayminute}
    durationMinutes={props.meeting.durationMinutes}
    twoLines={props.twoLines}
  />
);
