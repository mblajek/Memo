import {currentDate, cx, htmlAttributes, useLangFunc} from "components/utils";
import {useLocale} from "components/utils/LocaleContext";
import {DateTime} from "luxon";
import {FaSolidCircleDot} from "solid-icons/fa";
import {VoidComponent, splitProps} from "solid-js";
import {useHolidays} from "../holidays";
import {WeekDaysCalculator} from "../week_days_calculator";

interface Props extends htmlAttributes.div {
  readonly day: DateTime;
}

/** The header for a calendar column representing a date. */
export const DayHeader: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["day"]);
  const locale = useLocale();
  const t = useLangFunc();
  const holidays = useHolidays();
  const weekDaysCalculator = new WeekDaysCalculator(locale);
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: cx("w-full flex flex-col items-center px-1 overflow-clip", {
          "text-red-800": holidays.isHoliday(props.day) || weekDaysCalculator.isWeekend(props.day),
        }),
      })}
    >
      <div class="flex items-center gap-1">
        <div class={cx("mb-0.5 ", {invisible: !props.day.hasSame(currentDate(), "day")})} title={t("calendar.today")}>
          <FaSolidCircleDot class="text-red-700" size={10} />
        </div>
        <div class={cx("text-2xl", holidays.isHoliday(props.day) ? "underline decoration-1" : undefined)}>
          {props.day.day}
        </div>
        <div style={{width: "10px"}} />
      </div>
      <div class="-mt-1.5 uppercase text-xs text-center">{props.day.weekdayLong}</div>
    </div>
  );
};
