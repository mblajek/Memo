import {VoidComponent} from "solid-js";
import {useLangFunc} from "../utils";

interface Props {
  readonly minutes: number;
}

export const TimeDuration: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const text = () => {
    if (!props.minutes) {
      return t("calendar.units.minutes", {count: 0});
    }
    if (props.minutes % 60 === 0) {
      return t("calendar.units.hours", {count: props.minutes / 60});
    }
    if (props.minutes < 60) {
      return t("calendar.units.minutes", {count: props.minutes});
    }
    return t("calendar.duration.hours_minutes", {hours: Math.floor(props.minutes / 60), minutes: props.minutes % 60});
  };
  return <>{text()}</>;
};
