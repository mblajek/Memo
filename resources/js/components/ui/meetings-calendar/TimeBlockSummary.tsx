import {cx, htmlAttributes, useLangFunc} from "components/utils";
import {crossesDateBoundaries} from "components/utils/day_minute_util";
import {DateTime} from "luxon";
import {createMemo, JSX, splitProps, VoidComponent} from "solid-js";
import {TimeSpan} from "../calendar/types";
import {title} from "../title";
import {timeSpanSummary, TimeSpanSummary} from "./TimeSpanSummary";

const _DIRECTIVES_ = null && title;

interface TimeBlockSummaryProps extends Omit<htmlAttributes.span, "title"> {
  readonly day: DateTime;
  readonly timeSpan: TimeSpan;
  readonly label?: (time: JSX.Element) => JSX.Element;
  readonly title?: (time: string) => string;
  readonly hovered?: boolean;
  readonly onHoverChange?: (hovered: boolean) => void;
  readonly onEditClick?: () => void;
}

export const TimeBlockSummary: VoidComponent<TimeBlockSummaryProps> = (allProps) => {
  const [props, spanProps] = splitProps(allProps, [
    "day",
    "timeSpan",
    "label",
    "title",
    "hovered",
    "onHoverChange",
    "onEditClick",
  ]);
  const t = useLangFunc();
  const crosses = createMemo(() => crossesDateBoundaries(props.day, props.timeSpan));
  return (
    <span
      {...htmlAttributes.merge(spanProps, {
        class: cx(
          "whitespace-nowrap rounded overflow-clip text-ellipsis",
          props.hovered ? "outline outline-2 outline-memo-active cursor-pointer" : undefined,
        ),
        style: {"outline-offset": "-2px"},
        ...(props.onEditClick
          ? {
              tabindex: 0,
              onClick: (e) => {
                e.stopPropagation();
                props.onEditClick?.();
              },
            }
          : undefined),
      })}
      use:title={props.title?.(timeSpanSummary(t, props.timeSpan, crosses()))}
      onMouseEnter={() => props.onHoverChange?.(true)}
      onMouseLeave={() => props.onHoverChange?.(false)}
    >
      {(props.label || ((time) => time))(<TimeSpanSummary timeSpan={props.timeSpan} {...crosses()} />)}
    </span>
  );
};
