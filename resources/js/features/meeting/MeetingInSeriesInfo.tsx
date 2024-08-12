import {capitalizeString} from "components/ui/Capitalize";
import {LinkWithNewTabLink} from "components/ui/LinkWithNewTabLink";
import {MeetingRepeatIcon} from "components/ui/meetings-calendar/MeetingRepeatIcon";
import {title} from "components/ui/title";
import {LangFunc, useLangFunc} from "components/utils";
import {SeriesNumberAndCount, TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {Match, Show, Switch, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

const _DIRECTIVES_ = null && title;

interface Props {
  readonly meeting: Partial<Pick<TQMeetingResource, "fromMeetingId" | "interval" | "seriesNumber" | "seriesCount">>;
  readonly compact?: boolean;
  /** Whether to show the link to the series page. Only relevant in non-compact mode. Default: true. */
  readonly showLink?: boolean;
}

export const MeetingInSeriesInfo: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  return (
    <Show when={props.meeting.fromMeetingId || props.meeting.seriesCount}>
      <Switch>
        <Match when={props.compact}>
          <span
            use:title={[
              t("with_colon", {text: t("meetings.meeting_is_in_series")}),
              seriesNumberInfoText(t, props.meeting),
              meetingIntervalCommentText(t, props.meeting.interval || undefined),
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <MeetingRepeatIcon seriesData={props.meeting} class="inlineIcon" />
          </span>
        </Match>
        <Match when="not compact">
          <span class="flex gap-x-1 whitespace-nowrap">
            <span use:title={t("meetings.meeting_is_in_series")}>
              <MeetingRepeatIcon seriesData={props.meeting} class="inlineIcon" />
            </span>
            <SeriesNumberInfo {...props.meeting} />
            <span class="text-grey-text">
              <MeetingIntervalCommentText {...props.meeting} />
            </span>
            <Show when={props.showLink ?? true}>
              <LinkWithNewTabLink
                href={`/${activeFacility()?.url}/meeting-series/${props.meeting.fromMeetingId}`}
                sameTabLink={false}
                newTabLink
                newTabLinkTitle={t("meetings.show_meetings_in_series_list_in_new_tab")}
              />
            </Show>
          </span>
        </Match>
      </Switch>
    </Show>
  );
};

interface SeriesNumberInfoProps extends Partial<SeriesNumberAndCount> {}

export const SeriesNumberInfo: VoidComponent<SeriesNumberInfoProps> = (props) => {
  const t = useLangFunc();
  return (
    <Show when={props.seriesNumber != undefined && props.seriesCount != undefined}>
      <span class="flex">
        <span use:title={capitalizeString(t("models.meeting.seriesNumber"))}>{props.seriesNumber}</span>
        <span class="text-grey-text whitespace-pre">{t("meetings.meeting_series_number_and_count_separator")}</span>
        <span class="text-grey-text" use:title={capitalizeString(t("models.meeting.seriesCount"))}>
          {props.seriesCount}
        </span>
      </span>
    </Show>
  );
};

function seriesNumberInfoText(t: LangFunc, {seriesNumber, seriesCount}: Partial<SeriesNumberAndCount>) {
  return seriesNumber == undefined || seriesCount == undefined
    ? undefined
    : `${seriesNumber}${t("meetings.meeting_series_number_and_count_separator")}${seriesCount}`;
}

interface MeetingIntervalCommentTextProps {
  readonly interval?: string | null;
}

export const MeetingIntervalCommentText: VoidComponent<MeetingIntervalCommentTextProps> = (props) => {
  const t = useLangFunc();
  return <Show when={props.interval}>{(interval) => <>{meetingIntervalCommentText(t, interval())}</>}</Show>;
};

function meetingIntervalCommentText(t: LangFunc, interval: string | undefined) {
  return interval
    ? `${t("parenthesised", {text: t(`meetings.interval_labels.${interval}`, {defaultValue: interval})})}`
    : "";
}
