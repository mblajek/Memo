import {useLangFunc} from "components/utils/lang";
import {currentDate} from "components/utils/time";
import {DateTime} from "luxon";
import {VoidComponent} from "solid-js";

interface Props {
  readonly birthDate: DateTime;
}

export const Age: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const diff = () => currentDate().diff(props.birthDate, "years");
  return (
    <span>
      {t("calendar.age_with_colon")}{" "}
      {diff().toMillis() < 0 ? "?" : t("calendar.units.years", {count: Math.floor(diff().years)})}
    </span>
  );
};
