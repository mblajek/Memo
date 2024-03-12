import {ACTION_ICONS} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {Match, Show, Switch, VoidComponent} from "solid-js";

interface Props {
  readonly meeting: Pick<MeetingResource, "fromMeetingId" | "interval">;
  readonly compact?: boolean;
}

export const MeetingInSeriesInfo: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const text = () =>
    t("meetings.meeting_is_in_series") +
    (props.meeting.interval
      ? ` ${t("parenthesised", {text: t(`meetings.interval_labels.${props.meeting.interval}`, {defaultValue: props.meeting.interval})})}`
      : "");
  return (
    <Show when={props.meeting.fromMeetingId}>
      <Switch>
        <Match when={props.compact}>
          <span title={text()}>
            <ACTION_ICONS.repeat class="inlineIcon" />
          </span>
        </Match>
        <Match when={true}>
          <span>
            <ACTION_ICONS.repeat class="inlineIcon" /> {text()}
          </span>
        </Match>
      </Switch>
    </Show>
  );
};
