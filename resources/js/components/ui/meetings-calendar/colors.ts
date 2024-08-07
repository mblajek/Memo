import {JSX} from "solid-js";
import {bleachColor, randomColor} from "../colors";

export interface Coloring {
  readonly border: string;
  readonly bg: string;
  readonly bgHover: string;
  readonly headerBg: string;
  readonly separator: string;
}

function coloringFromColor(baseColor: string): Coloring {
  return {
    border: baseColor,
    bg: bleachColor(baseColor, {amount: 0.75}),
    bgHover: bleachColor(baseColor, {amount: 0.52}),
    headerBg: bleachColor(baseColor, {amount: 0.35}),
    separator: bleachColor(baseColor, {amount: 0.4}),
  };
}

export function getRandomEventColors(seedString: string): Coloring {
  return coloringFromColor(randomColor({seedString, lightness: [50, 70], chroma: [20, 30]}));
}

export const COMPLETED_MEETING_COLORING: Coloring = {
  ...coloringFromColor("#ccc"),
  bgHover: "#ddd",
  headerBg: "#ccc",
  separator: "#ccc",
};
export const CANCELLED_MEETING_COLORING: Coloring = (() => {
  const coloring = coloringFromColor("black");
  return {
    ...coloring,
    headerBg: coloring.bgHover,
  };
})();
export const NON_STAFF_PLANNED_MEETING_COLORING: Coloring = {
  ...coloringFromColor("#aaa"),
  border: "#222",
  headerBg: "#aa8",
};

export function coloringToStyle(
  coloring: Coloring,
  {hover = false, part = "main"}: {hover?: boolean; part?: "main" | "header" | "separator" | "colorMarker"} = {},
): JSX.CSSProperties {
  switch (part) {
    case "main":
      return hover
        ? {
            "border-color": coloring.border,
            "background-color": coloring.bgHover,
          }
        : {
            "border-color": coloring.border,
            "background-color": coloring.bg,
          };
    case "header":
      return {"background-color": coloring.headerBg};
    case "separator":
      return {"border-color": coloring.separator};
    case "colorMarker":
      return {
        "border-color": coloring.border,
        "background-color": coloring.headerBg,
      };
    default:
      return part satisfies never;
  }
}

export const CALENDAR_BACKGROUNDS = (() => {
  const main = "#e2e3e7";
  const facilityWorkTime = "#ecedf1";
  const staffWorkTime = "#ffffff";
  const leaveTimeLines = "#cdcfd1";
  return {
    main,
    facilityWorkTime,
    staffWorkTime,
    facilityLeaveTime: `repeating-linear-gradient(-30deg, ${main}c0, ${staffWorkTime}40 5px, ${main}c0 10px, ${leaveTimeLines} 11px, ${main}c0 12px)`,
    staffLeaveTime: `repeating-linear-gradient(-30deg, ${main}c0, ${staffWorkTime}40 5px, ${main}c0 10px, ${leaveTimeLines} 11px, ${main}c0 12px)`,
  } as const;
})();

export const MIDNIGHT_CROSSING_SYMBOL = "⋮";
