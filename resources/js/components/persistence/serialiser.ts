export interface Serialiser<T, S = string> {
  serialise(value: T): S;
  deserialise(value: S): T;
}

export function jsonSerialiser<T>(): Serialiser<T> {
  return {
    serialise: JSON.stringify,
    deserialise: JSON.parse,
  };
}
