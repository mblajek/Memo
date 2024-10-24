import {Button} from "components/ui/Button";
import {capitalizeString} from "components/ui/Capitalize";
import {title} from "components/ui/title";
import {currentDate, cx, htmlAttributes, useLangFunc} from "components/utils";
import {DateTime} from "luxon";
import {FaSolidCircleDot} from "solid-icons/fa";
import {Show, VoidComponent, splitProps} from "solid-js";
import {useHolidays} from "../holidays";

type _Directives = typeof title;

interface Props extends htmlAttributes.div {
  readonly day: DateTime;
  readonly onDateClick?: () => void;
}

/** The header for a calendar column representing a date. */
export const DayHeader: VoidComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["day", "onDateClick"]);
  const t = useLangFunc();
  const holidays = useHolidays();
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: cx("w-full flex flex-col items-center px-1 overflow-clip", {
          "text-red-800": holidays.isHoliday(props.day) || props.day.isWeekend,
        }),
      })}
    >
      <Button onClick={() => props.onDateClick?.()} class="flex items-center" disabled={!props.onDateClick}>
        <Show when={props.day.hasSame(currentDate(), "day")}>
          <div class="w-0 relative -left-3" use:title={capitalizeString(t("calendar.today"))}>
            <FaSolidCircleDot class="text-red-700" size={10} />
          </div>
        </Show>
        <div class={cx("text-2xl", holidays.isHoliday(props.day) ? "underline decoration-1" : undefined)}>
          {props.day.day}
        </div>
      </Button>
      <div class="-mt-1.5 uppercase text-xs text-center">{props.day.weekdayLong}</div>
    </div>
  );
};
