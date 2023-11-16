import {EN_DASH} from "components/ui/symbols";
import {htmlAttributes} from "components/utils";
import {Interval} from "luxon";
import {ParentComponent, splitProps} from "solid-js";

// Note: The implementation of the event blocks is not final. It will depend a lot on the event model
// which is not yet finalised. It should also display a larger version of the event block on hover.

interface AllDayEventProps {
  readonly baseColor: string;
}

export const AllDayEvent: ParentComponent<AllDayEventProps> = (props) => (
  <div
    class="w-full h-full border rounded px-0.5 overflow-clip cursor-pointer"
    style={{
      "border-color": props.baseColor,
      "background-color": bleachColor(props.baseColor),
    }}
  >
    {props.children}
  </div>
);

interface PartDayEventProps {
  readonly baseColor: string;
  readonly range: Interval;
}

const HOUR_FORMAT = {hour: "numeric", minute: "2-digit"} as const;

export const PartDayEvent: ParentComponent<PartDayEventProps> = (props) => (
  <div
    class="w-full h-full border rounded px-0.5 overflow-clip flex flex-col items-stretch cursor-pointer"
    style={{
      "border-color": props.baseColor,
      "background-color": bleachColor(props.baseColor),
    }}
  >
    <div class="whitespace-nowrap font-weight-medium">
      {props.range.start.toLocaleString(HOUR_FORMAT)}
      {EN_DASH}
      {props.range.end.toLocaleString(HOUR_FORMAT)}
    </div>
    <hr class="border-inherit" />
    {props.children}
  </div>
);

interface TagProps extends htmlAttributes.div {
  readonly color: string;
}

export const Tag: ParentComponent<TagProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["color"]);
  return (
    <div
      {...htmlAttributes.merge(divProps, {
        class: "border py-0.5 px-1 inline-block",
        style: {
          "color": props.color,
          "border-color": props.color,
          "border-radius": "0.7rem",
          "background-color": bleachColor(props.color, {amount: 0.8}),
        },
      })}
    />
  );
};

function bleachColor(baseColor: string, {amount = 0.9} = {}) {
  return `color-mix(in srgb, ${baseColor}, white ${100 * amount}%)`;
}
