import {JSONValue} from "data-access/memo-api/types";
import {DateTime, Duration, Interval} from "luxon";
import {DaysRange} from "../ui/calendar/days_range";
import {Version} from "./version";

export interface Serialiser<T, S = string> {
  serialise(value: T): S;
  deserialise(value: S): T;
  version?: Version;
}

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

const CLASS_KEY = "__rjs";

function richJSONToPlainOneLevel<U>(value: RichJSONValue, valueOnPlain: U) {
  if (value && typeof value === "object") {
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
    }
  }
  return valueOnPlain;
}

function richJSONFromPlainOneLevel<U>(
  value: JSONValue | Readonly<{[key: string]: RichJSONValue}>,
  valueOnPlain: U,
): RichJSONValue | U {
  if (value && typeof value === "object" && Object.hasOwn(value, CLASS_KEY) && Object.hasOwn(value, "value")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {[CLASS_KEY]: classKey, value: storedValue} = value as {[CLASS_KEY]: string; value: any};
    switch (classKey) {
      case "Map":
        return new Map(storedValue);
      case "Set":
        return new Set(storedValue);
      case "DateTime":
        return DateTime.fromISO(storedValue);
      case "Duration":
        return Duration.fromISO(storedValue);
      case "Interval":
        return Interval.fromISO(storedValue);
      case "DaysRange":
        return new DaysRange(DateTime.fromISO(storedValue.start), DateTime.fromISO(storedValue.end));
    }
  }
  return valueOnPlain;
}

export namespace richJSONConverter {
  export function toPlain(value: RichJSONValue): JSONValue {
    const valueAsPlain = richJSONToPlainOneLevel(value, undefined);
    if (valueAsPlain === undefined) {
      if (Array.isArray(value)) {
        return value.map(toPlain);
      } else if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, toPlain(value)]));
      } else {
        return value;
      }
    } else {
      return toPlain(valueAsPlain);
    }
  }

  export function fromPlain(value: JSONValue): RichJSONValue {
    if (Array.isArray(value)) {
      return value.map(fromPlain);
    } else if (value && typeof value === "object") {
      const plainValue = Object.fromEntries(Object.entries(value).map(([key, value]) => [key, fromPlain(value)]));
      return richJSONFromPlainOneLevel(plainValue, plainValue);
    } else {
      return value;
    }
  }
}

/**
 * A JSON serialiser that supports also some common classes. More classes can be added as needed.
 *
 * Note that there are still many values that are not supported, see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify.
 */
export function richJSONSerialiser<T extends RichJSONValue>(): Serialiser<T> {
  return {
    serialise: (value: T) => JSON.stringify(value, (_key, value) => richJSONToPlainOneLevel(value, value)),
    deserialise: (value: string) => JSON.parse(value, (_key, value) => richJSONFromPlainOneLevel(value, value)),
    version: [2],
  };
}
