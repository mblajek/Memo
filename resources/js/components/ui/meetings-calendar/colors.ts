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
  return coloringFromColor(randomColor({seedString, lightness: [50, 70], chroma: [20, 55]}));
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
  const mainBg = "#e2e3e7";
  const facilityWorkTime = "#ecedf1";
  const mainWorkTime = "#ffffff";
  const leaveTimeLines = "#cdcfd1";
  return {
    mainBg,
    facilityWorkTime,
    mainWorkTime,
    facilityLeaveTime: `repeating-linear-gradient(-30deg, ${mainBg}c0, ${mainWorkTime}40 8px, ${mainBg}c0 16px, ${leaveTimeLines} 17px, ${mainBg}c0 18px)`,
    staffLeaveTime: `repeating-linear-gradient(-45deg, ${mainBg}c0, ${mainWorkTime}40 4px, ${mainBg}c0 8px, ${leaveTimeLines}a0 9px, ${mainBg}c0 10px)`,
    holiday: `repeating-linear-gradient(to left, #f0101050 0 1px, transparent 2px 10px, #f0101050 11px)`,
  } as const;
})();

export const MIDNIGHT_CROSSING_SYMBOL = "⋮";
