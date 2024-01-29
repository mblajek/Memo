import {JSX} from "solid-js";
import {bleachColor, randomColor} from "../colors";

export interface Coloring {
  readonly regular: JSX.CSSProperties;
  readonly hover: JSX.CSSProperties;
}

function coloringFromColor(baseColor: string): Coloring {
  return {
    regular: {
      "border-color": baseColor,
      "background-color": bleachColor(baseColor, {amount: 0.7}),
    },
    hover: {
      "border-color": baseColor,
      "background-color": bleachColor(baseColor, {amount: 0.5}),
    },
  };
}

export function getRandomEventColors(seedString: string): Coloring {
  return coloringFromColor(randomColor({seedString, whiteness: [0, 50], blackness: [20, 40]}));
}

export const COMPLETED_MEETING_COLORING = coloringFromColor("#ccc");
export const CANCELLED_MEETING_COLORING = coloringFromColor("black");
