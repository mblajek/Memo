import {actionIcons} from "components/ui/icons";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {VoidComponent} from "solid-js";
import {Dynamic} from "solid-js/web";

interface Props {
  readonly seriesData?: Partial<Pick<TQMeetingResource, "seriesNumber" | "seriesCount">>;
  readonly class?: string;
}

export const MeetingRepeatIcon: VoidComponent<Props> = (props) => {
  const iconComp = () => {
    if (
      !props.seriesData ||
      !props.seriesData.seriesNumber ||
      !props.seriesData.seriesCount ||
      props.seriesData.seriesCount === 1
    ) {
      return actionIcons.Repeat;
    }
    if (props.seriesData.seriesNumber === 1) {
      return actionIcons.RepeatFirst;
    }
    if (props.seriesData.seriesNumber === props.seriesData.seriesCount) {
      return actionIcons.RepeatLast;
    }
    return actionIcons.Repeat;
  };
  return <Dynamic component={iconComp()} class={props.class} />;
};
