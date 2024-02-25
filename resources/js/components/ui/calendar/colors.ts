import {JSX} from "solid-js";
import {bleachColor, randomColor} from "../colors";

export interface Coloring {
  readonly border: string;
  readonly bg: string;
  readonly bgHover: string;
  readonly headerBg: string;
}

function coloringFromColor(baseColor: string): Coloring {
  return {
    border: baseColor,
    bg: bleachColor(baseColor, {amount: 0.75}),
    bgHover: bleachColor(baseColor, {amount: 0.52}),
    headerBg: bleachColor(baseColor, {amount: 0.35}),
  };
}

export function getRandomEventColors(seedString: string): Coloring {
  return coloringFromColor(randomColor({seedString, lightness: [50, 70], chroma: [20, 30]}));
}

export const COMPLETED_MEETING_COLORING = {...coloringFromColor("#ccc"), bgHover: "#ddd", headerBg: "#ccc"};
export const CANCELLED_MEETING_COLORING = (() => {
  const coloring = coloringFromColor("black");
  return {...coloring, headerBg: coloring.bgHover};
})();

export function coloringToStyle(
  coloring: Coloring,
  {hover = false, part = "main"}: {hover?: boolean; part?: "main" | "header"} = {},
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
      return {
        "background-color": coloring.headerBg,
      };
    default:
      return part satisfies never;
  }
}
