import {htmlAttributes, useLangFunc} from "components/utils";
import {crossesDateBoundaries} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {createMemo, JSX, splitProps, VoidComponent} from "solid-js";
import {TimeSpan} from "../calendar/types";
import {timeSpanSummary, TimeSpanSummary} from "./TimeSpanSummary";

interface TimeBlockSummaryProps extends Omit<htmlAttributes.span, "title"> {
  readonly day: DateTime;
  readonly timeSpan: TimeSpan;
  readonly label?: (time: JSX.Element) => JSX.Element;
  readonly title?: (time: string) => string;
}

export const TimeBlockSummary: VoidComponent<TimeBlockSummaryProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["day", "timeSpan", "label", "title"]);
  const t = useLangFunc();
  const crosses = createMemo(() => crossesDateBoundaries(props.day, props.timeSpan));
  return (
    <span
      {...htmlAttributes.merge(divProps, {class: "whitespace-nowrap rounded overflow-clip text-ellipsis"})}
      title={props.title?.(timeSpanSummary(t, props.timeSpan, crosses()))}
    >
      {(props.label || ((time) => time))(<TimeSpanSummary timeSpan={props.timeSpan} {...crosses()} />)}
    </span>
  );
};
