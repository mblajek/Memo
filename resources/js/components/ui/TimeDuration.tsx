import {useLangFunc} from "components/utils/lang";
import {VoidComponent} from "solid-js";
import {MAX_DAY_MINUTE} from "../utils/day_minute_util";

interface Props {
  readonly minutes: number;
  readonly maxIsAllDay?: boolean;
}

export const TimeDuration: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const text = () => {
    if (!props.minutes) {
      return t("calendar.units.minutes", {count: 0});
    } else if (props.minutes === MAX_DAY_MINUTE && props.maxIsAllDay) {
      return t("calendar.all_day");
    } else if (props.minutes % 60 === 0) {
      return t("calendar.units.hours", {count: props.minutes / 60});
    } else if (props.minutes < 60) {
      return t("calendar.units.minutes", {count: props.minutes});
    } else
      return t("calendar.duration.hours_minutes", {hours: Math.floor(props.minutes / 60), minutes: props.minutes % 60});
  };
  return <>{text()}</>;
};
