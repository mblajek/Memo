import {Random} from "../utils/random";

interface RandomColorParams {
  /** The seed for the color, if should be deterministic. */
  readonly seedString?: string;
  /**
   * Lightness percent, or range to pick randomly.
   * See [lch](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch).
   */
  readonly lightness: number | RandomRange;
  /**
   * Chroma percent, or range to pick randomly.
   * See [lch](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/lch).
   */
  readonly chroma: number | RandomRange;
}

type RandomRange = readonly [number, number];

function getFromRange(r: Random, range: number | RandomRange): number {
  return typeof range === "number" ? range : r.nextInt(...range);
}

export function randomColor({seedString, lightness, chroma}: RandomColorParams) {
  const r = seedString ? Random.fromString(seedString) : Random.RANDOM;
  const hue = r.nextFloat();
  return `lch(${getFromRange(r, lightness)}% ${getFromRange(r, chroma)}% ${hue}turn)`;
}

/** Mixes the color with the specified amount of white. */
export function bleachColor(baseColor: string, {amount = 0.8} = {}) {
  return `color-mix(in srgb, ${baseColor}, white ${100 * amount}%)`;
}

/** Applies the opacity to the CSS color. The opacity can be a CSS expression, e.g. `var(--something)`. */
export function applyOpacity(baseColor: string, opacity: number | string) {
  return `rgb(from ${baseColor} r g b / ${opacity})`;
}

export function applyTextOpacity(baseColor: string) {
  return applyOpacity(baseColor, "var(--tw-text-opacity, 1)");
}

export function applyBgOpacity(baseColor: string) {
  return applyOpacity(baseColor, "var(--tw-bg-opacity, 1)");
}
