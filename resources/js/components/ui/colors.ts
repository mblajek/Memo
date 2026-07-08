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
  return `oklch(${getFromRange(r, lightness)}% ${getFromRange(r, chroma)}% ${hue}turn)`;
}

/** Mixes the color with the specified amount of white. */
export function bleachColor(baseColor: string, {amount = 0.8} = {}) {
  return `color-mix(in srgb, ${baseColor}, white ${100 * amount}%)`;
}
