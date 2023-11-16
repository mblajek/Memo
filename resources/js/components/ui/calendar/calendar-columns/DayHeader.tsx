import {currentDate, cx, htmlAttributes, useLangFunc} from "components/utils";
import {DateTime} from "luxon";
import {FaSolidCircleDot} from "solid-icons/fa";
import {VoidComponent, splitProps} from "solid-js";

interface Props extends htmlAttributes.div {
  readonly day: DateTime;
}

/** The header for a calendar column representing a date. */
export const DayHeader: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["day"]);
  const t = useLangFunc();
  return (
    <div {...htmlAttributes.merge(divProps, {class: "w-full flex flex-col items-center px-1 overflow-clip"})}>
      <div class="flex items-center gap-1">
        <div class={cx("mb-0.5 ", {invisible: !props.day.hasSame(currentDate(), "day")})} title={t("calendar.today")}>
          <FaSolidCircleDot class="text-red-700" size={10} />
        </div>
        <div class="text-2xl">{props.day.day}</div>
        <div style={{width: "10px"}} />
      </div>
      <div class="-mt-1.5 uppercase text-xs text-center wrapTextAnywhere">{props.day.weekdayLong}</div>
    </div>
  );
};
