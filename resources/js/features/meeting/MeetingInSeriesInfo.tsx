import {ACTION_ICONS} from "components/ui/icons";
import {title} from "components/ui/title";
import {LangFunc, useLangFunc} from "components/utils";
import {MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {JSX, Match, Show, Switch, VoidComponent} from "solid-js";

const _DIRECTIVES_ = null && title;

interface Props {
  readonly meeting: Partial<Pick<MeetingResource, "fromMeetingId" | "interval">>;
  readonly compact?: boolean;
}

export const MeetingInSeriesInfo: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const text = () =>
    t("meetings.meeting_is_in_series") + meetingIntervalCommentText(t, props.meeting.interval || undefined);
  return (
    <Show when={props.meeting.fromMeetingId}>
      <Switch>
        <Match when={props.compact}>
          <span use:title={text()}>
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

interface MeetingIntervalCommentTextProps {
  readonly interval: string | undefined;
  readonly wrapIn?: (text: string) => JSX.Element;
}

export const MeetingIntervalCommentText: VoidComponent<MeetingIntervalCommentTextProps> = (props) => {
  const t = useLangFunc();
  return (
    <Show when={props.interval}>
      {(interval) => {
        const text = () => meetingIntervalCommentText(t, interval());
        return (
          <Show when={props.wrapIn} fallback={<>{text()}</>}>
            {(wrapIn) => wrapIn()(text())}
          </Show>
        );
      }}
    </Show>
  );
};

function meetingIntervalCommentText(t: LangFunc, interval: string | undefined) {
  return interval
    ? ` ${t("parenthesised", {text: t(`meetings.interval_labels.${interval}`, {defaultValue: interval})})}`
    : "";
}
