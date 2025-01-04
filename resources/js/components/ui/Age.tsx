import {currentDate, useLangFunc} from "components/utils";
import {DateTime} from "luxon";
import {VoidComponent} from "solid-js";

interface Props {
  readonly birthDate: DateTime;
}

export const Age: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const diff = () => currentDate().diff(props.birthDate, "years");
  return <span>{diff().toMillis() < 0 ? "?" : t("calendar.units.years", {count: Math.floor(diff().years)})}</span>;
};
