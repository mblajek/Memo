import {DateTime, Duration, Interval} from "luxon";
import {DaysRange} from "../ui/calendar/days_range";
import {Version} from "./version";

export interface Serialiser<T, S = string> {
  serialise(value: T): S;
  deserialise(value: S): T;
  version?: Version;
}

export type JSONValue<ExtraTypes = never> =
  | string
  | number
  | boolean
  | null
  | readonly JSONValue<ExtraTypes>[]
  | Readonly<{readonly [key: string]: JSONValue<ExtraTypes>}>
  | ExtraTypes;

/**
 * A JSON serialiser, supporting only values directly supported by JSON serialisation.
 *
 * Note that not all values are supported in JSON, see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify.
 */
export function rawJSONSerialiser<T extends JSONValue>(): Serialiser<T> {
  return {
    serialise: JSON.stringify,
    deserialise: JSON.parse,
  };
}

export type RichJSONValue = JSONValue<
  ReadonlyMap<RichJSONValue, RichJSONValue> | ReadonlySet<RichJSONValue> | DateTime | Duration | Interval | DaysRange
>;

/**
 * A JSON serialiser that supports also some common classes. More classes can be added as needed.
 *
 * Note that there are still many values that are not supported, see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify.
 */
export function richJSONSerialiser<T extends RichJSONValue>(): Serialiser<T> {
  const CLASS_KEY = "__rjs";

  return {
    serialise: (value: T) =>
      JSON.stringify(value, (_key, value) => {
        if (value instanceof Map) {
          return {[CLASS_KEY]: "Map", value: [...value]};
        } else if (value instanceof Set) {
          return {[CLASS_KEY]: "Set", value: [...value]};
        } else if (value instanceof DateTime) {
          return {[CLASS_KEY]: "DateTime", value: value.toISO()};
        } else if (value instanceof Duration) {
          return {[CLASS_KEY]: "Duration", value: value.toISO()};
        } else if (value instanceof Interval) {
          return {[CLASS_KEY]: "Interval", value: value.toISO()};
        } else if (value instanceof DaysRange) {
          return {[CLASS_KEY]: "DaysRange", value: {start: value.start.toISODate(), end: value.end.toISODate()}};
        } else {
          return value;
        }
      }),
    deserialise: (value: string) =>
      JSON.parse(value, (_key, value) => {
        if (value && typeof value === "object" && Object.hasOwn(value, CLASS_KEY) && Object.hasOwn(value, "value")) {
          switch (value[CLASS_KEY]) {
            case "Map":
              return new Map(value.value);
            case "Set":
              return new Set(value.value);
            case "DateTime":
              return DateTime.fromISO(value.value);
            case "Duration":
              return Duration.fromISO(value.value);
            case "Interval":
              return Interval.fromISO(value.value);
            case "DaysRange":
              return new DaysRange(DateTime.fromISO(value.value.start), DateTime.fromISO(value.value.end));
          }
        }
        return value;
      }),
    version: [2],
  };
}
