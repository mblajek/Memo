import {Random} from "../utils/random";

interface RandomColorParams {
  /** The seed for the color, if should be deterministic. */
  readonly uuidSeed?: string;
  /** Whiteness percent, or range to pick randomly. */
  readonly whiteness: number | RandomRange;
  /** Blackness percent, or range to pick randomly. */
  readonly blackness: number | RandomRange;
}

type RandomRange = readonly [number, number];

function getFromRange(r: Random, range: number | RandomRange): number {
  return typeof range === "number" ? range : r.nextInt(...range);
}

export function randomColor({uuidSeed, whiteness, blackness}: RandomColorParams) {
  const r = uuidSeed ? Random.fromUUID(uuidSeed) : Random.RANDOM;
  return `hwb(${r.nextFloat()}turn ${getFromRange(r, whiteness)}% ${getFromRange(r, blackness)}%)`;
}

/** Mixes the color with the specified amount of white. */
export function bleachColor(baseColor: string, {amount = 0.8} = {}) {
  return `color-mix(in srgb, ${baseColor}, white ${100 * amount}%)`;
}
